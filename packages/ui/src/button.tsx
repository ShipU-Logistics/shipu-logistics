import React from 'react';

const variantClass = {
    primary: 'bg-yellow-500 text-red-500',
    secondary: 'bg-red-500 text-green-500',
};

interface ButtonProps {
    variant: 'primary' | 'secondary';
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}

export const Button = ({ variant, disabled, children }: ButtonProps) => {
    return (
        <button disabled={disabled} className={`${variantClass[variant]}`}>
            {children}
        </button>
    );
};
