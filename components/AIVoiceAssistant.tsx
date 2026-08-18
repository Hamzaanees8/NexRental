import React, { useEffect, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

const retellWebClient = new RetellWebClient();

export const AIVoiceAssistant: React.FC = () => {
    const [isCalling, setIsCalling] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const [transcripts, setTranscripts] = useState<any[]>([]);

    useEffect(() => {
        // Setup event listeners for the Retell client
        retellWebClient.on('call_started', () => {
            console.log('Call started');
            setIsCalling(true);
            setIsConnecting(false);
            setTranscripts([]);
        });

        retellWebClient.on('call_ended', () => {
            console.log('Call ended');
            setIsCalling(false);
            setIsConnecting(false);
            
            // Check for new bookings made during the call
            setTimeout(async () => {
                const twoMinsAgo = new Date();
                twoMinsAgo.setMinutes(twoMinsAgo.getMinutes() - 2);
                
                const { data, error } = await supabase.from('rentals')
                    .select('id, vehicles(make_model)')
                    .gte('created_at', twoMinsAgo.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1);
                    
                if (data && data.length > 0) {
                    const vehicleInfo = data[0].vehicles as any;
                    const makeModel = Array.isArray(vehicleInfo) ? vehicleInfo[0]?.make_model : vehicleInfo?.make_model;
                    toast.success(`Booking reserved successfully for ${makeModel || 'your vehicle'}!`, { duration: 6000 });
                }
            }, 3000); // 3 second delay to ensure DB insertion is complete
        });

        retellWebClient.on('update', (update: any) => {
            // Update could contain the transcript array directly or inside a property
            if (update?.transcript && Array.isArray(update.transcript)) {
                setTranscripts(update.transcript);
            } else if (Array.isArray(update)) {
                setTranscripts(update);
            }
        });

        retellWebClient.on('error', (error) => {
            console.error('An error occurred:', error);
            setIsCalling(false);
            setIsConnecting(false);
            toast.error('Voice assistant connection failed');
        });

        // Cleanup
        return () => {
            retellWebClient.off('call_started');
            retellWebClient.off('call_ended');
            retellWebClient.off('update');
            retellWebClient.off('error');
        };
    }, []);

    const toggleConversation = async () => {
        if (isCalling) {
            retellWebClient.stopCall();
            return;
        }

        setIsConnecting(true);

        try {
            // Call Supabase Edge Function to create a web call
            const { data, error } = await supabase.functions.invoke('create-web-call', {
                method: 'POST',
            });

            if (error) {
                throw new Error(error.message);
            }

            if (!data || !data.access_token) {
                // If Edge Function is not yet configured, we will mock the connection error
                // so the user knows it's pending backend setup
                throw new Error("Backend not configured. Missing access_token.");
            }

            // Start the call using the access token
            await retellWebClient.startCall({
                accessToken: data.access_token,
            });
        } catch (error: any) {
            console.error('Error starting call:', error);
            setIsConnecting(false);
            toast.error(error.message || 'Failed to start AI Voice Assistant');
        }
    };

    // Auto-scroll transcript
    const transcriptEndRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            
            {/* Live Subtitles Box */}
            {isCalling && (
                <div className="mb-4 w-80 max-h-96 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col transition-all duration-300 transform origin-bottom-right">
                    <div className="bg-indigo-600 p-3 text-white flex justify-between items-center shadow-sm">
                        <span className="font-semibold text-sm flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                            Live Call Transcript
                        </span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3 text-sm min-h-40">
                        {transcripts.length === 0 ? (
                            <p className="text-gray-400 text-center italic mt-auto mb-auto">Listening...</p>
                        ) : (
                            transcripts.map((msg, index) => (
                                <div key={index} className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-900 self-end rounded-br-none' : 'bg-gray-100 text-gray-800 self-start rounded-bl-none'}`}>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-50">
                                        {msg.role === 'user' ? 'You' : 'Nex AI'}
                                    </span>
                                    {msg.content}
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            )}

            <button
                onClick={toggleConversation}
                disabled={isConnecting}
                className={`flex items-center justify-center p-4 rounded-full shadow-lg transition-all duration-300 ${
                    isCalling
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : isConnecting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105'
                }`}
                title={isCalling ? "Stop Voice Assistant" : "Start Voice Assistant"}
            >
                {isConnecting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : isCalling ? (
                    <Square className="w-6 h-6 fill-current" />
                ) : (
                    <Mic className="w-6 h-6" />
                )}
            </button>
        </div>
    );
};
