import React, { useState, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  strikethrough?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({ 
  value, 
  onSave, 
  className = "", 
  placeholder = "Edit...", 
  strikethrough = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim() !== "" && tempValue !== value) {
      onSave(tempValue);
    } else {
      setTempValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        className={`bg-indigo-50 border-b border-indigo-500 outline-none px-1 w-full rounded focus:ring-2 focus:ring-indigo-200 ${className}`}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-slate-50 transition-colors px-1 -mx-1 rounded break-words ${strikethrough ? 'line-through text-slate-400 opacity-60' : ''} ${className}`}
    >
      {value || <span className="text-slate-300 italic">{placeholder}</span>}
    </span>
  );
};