import React, { useEffect, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

const retellWebClient = new RetellWebClient();

export const AIVoiceAssistant: React.FC = () => {
    const [isCalling, setIsCalling] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Setup event listeners for the Retell client
        retellWebClient.on('call_started', () => {
            console.log('Call started');
            setIsCalling(true);
            setIsConnecting(false);
        });

        retellWebClient.on('call_ended', () => {
            console.log('Call ended');
            setIsCalling(false);
            setIsConnecting(false);
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

    return (
        <div className="fixed bottom-6 right-6 z-50">
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
