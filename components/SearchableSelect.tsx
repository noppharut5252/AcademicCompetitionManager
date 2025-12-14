
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface SearchableSelectProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled, icon, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
        inputRef.current.focus();
        setFilterText(''); // Clear filter when opening
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
      opt.label.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className={`relative ${className || ''}`} ref={wrapperRef}>
        <div 
            className={`w-full bg-white border rounded-lg py-2.5 pl-3 pr-10 text-sm shadow-sm cursor-pointer flex items-center justify-between transition-colors
                ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-gray-400'}
                ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            `}
            onClick={() => !disabled && setIsOpen(!isOpen)}
        >
            <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
                {value ? selectedLabel : placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
               {icon || <ChevronDown className="h-4 w-4" />}
            </span>
        </div>

        {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-in fade-in zoom-in-95 duration-100">
                <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            placeholder="ค้นหา..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                        <div
                            key={opt.value}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 hover:text-blue-900 ${value === opt.value ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-900'}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className="block truncate">{opt.label}</span>
                            {value === opt.value && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="cursor-default select-none relative py-2 px-4 text-gray-500 italic text-center">
                        ไม่พบข้อมูล
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default SearchableSelect;
