import React, { useState, useEffect, useRef } from 'react';

interface MultiSearchableSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    onAddNew?: (newOption: string) => void;
    placeholder?: string;
    label?: string;
}

const MultiSearchableSelect: React.FC<MultiSearchableSelectProps> = ({ options, selected, onChange, onAddNew, placeholder = "Select cities...", label = "Allowed Cities" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase()) && !selected.includes(option)
    );

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="space-y-2" ref={wrapperRef}>
            <label className="block text-sm font-bold text-slate-700">{label}</label>

            <div className="relative">
                <div
                    className="w-full p-2 border rounded-xl bg-slate-50 focus-within:bg-white transition cursor-pointer flex justify-between items-center"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="text-slate-400 text-sm">
                        {placeholder}
                    </span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                </div>

                {isOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                        <div className="p-2 sticky top-0 bg-white border-b">
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Search cities..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                        <div className="py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <div
                                        key={option}
                                        className="p-3 cursor-pointer hover:bg-indigo-50 transition text-sm text-slate-700 flex items-center justify-between"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(option);
                                            setSearchTerm('');
                                        }}
                                    >
                                        {option}
                                        <span className="text-indigo-600 font-bold">+</span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    {searchTerm && !options.some(o => o.toLowerCase() === searchTerm.toLowerCase()) ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddNew?.(searchTerm);
                                                setSearchTerm('');
                                            }}
                                            className="w-full bg-indigo-50 text-indigo-600 py-2 rounded-lg font-bold hover:bg-indigo-100 transition"
                                        >
                                            Add "{searchTerm}" as new city
                                        </button>
                                    ) : (
                                        searchTerm ? 'No cities found' : 'All cities selected'
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <textarea
                    readOnly
                    className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-medium text-slate-700 focus:outline-none min-h-[80px]"
                    placeholder="Selected cities will appear here..."
                    value={selected.join(', ')}
                />
                {selected.length > 0 && (
                    <button
                        onClick={() => onChange([])}
                        className="absolute top-2 right-2 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-0.5 rounded transition uppercase font-bold"
                    >
                        Clear All
                    </button>
                )}
            </div>
        </div>
    );
};

export default MultiSearchableSelect;
