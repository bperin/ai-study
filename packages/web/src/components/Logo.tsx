interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

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
            <div className={`font-bold text-white ${textSize}`}>
                Dash AI
            </div>
        </div>
    );
}
