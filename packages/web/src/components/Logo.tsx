import Image from "next/image";

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

const sizeMap = {
    sm: { width: 120, height: 32 },
    md: { width: 180, height: 48 },
    lg: { width: 240, height: 64 },
    xl: { width: 300, height: 80 }
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
    const textSizeMap = {
        sm: "text-xl",
        md: "text-2xl", 
        lg: "text-4xl",
        xl: "text-6xl"
    };
    
    const textSize = textSizeMap[size];
    
    return (
        <div className={`flex items-center ${className}`}>
            <div className={`font-bold ${textSize}`}>
                <span className="text-red-500">D</span>
                <span className="text-white">ash </span>
                <span className="text-red-500">AI</span>
            </div>
        </div>
    );
}
