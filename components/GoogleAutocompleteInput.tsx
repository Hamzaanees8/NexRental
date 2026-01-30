import React, { useEffect, useRef } from 'react';

interface GoogleAutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const GoogleAutocompleteInput: React.FC<GoogleAutocompleteInputProps> = ({
    value,
    onChange,
    placeholder = "Search location...",
    className = ""
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);

    useEffect(() => {
        if (!inputRef.current) return;

        // Ensure google maps is loaded
        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
                types: ['geocode', 'establishment'],
                // Optional: Restrict to specific country if needed
                // componentRestrictions: { country: 'pk' }
            });

            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current.getPlace();
                if (place && place.formatted_address) {
                    onChange(place.formatted_address);
                } else if (place && place.name) {
                    onChange(place.name);
                }
            });
        }
    }, [onChange]);

    return (
        <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                </svg>
            </div>
            <input
                ref={inputRef}
                type="text"
                className={`w-full pl-10 pr-4 py-2 border rounded-xl bg-slate-50 outline-none text-slate-700 placeholder:text-slate-400 font-medium ${className}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};

export default GoogleAutocompleteInput;
