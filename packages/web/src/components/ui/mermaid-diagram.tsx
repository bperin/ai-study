'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
  id?: string;
}

export function MermaidDiagram({ chart, className = '', id }: MermaidDiagramProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        fontSize: 14,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
        sequence: {
          useMaxWidth: true,
          wrap: true,
        },
        gantt: {
          useMaxWidth: true,
        },
        journey: {
          useMaxWidth: true,
        },
        timeline: {
          useMaxWidth: true,
        },
        gitGraph: {
          useMaxWidth: true,
        },
        c4: {
          useMaxWidth: true,
        },
        pie: {
          useMaxWidth: true,
        },
        quadrantChart: {
          useMaxWidth: true,
        },
        xyChart: {
          useMaxWidth: true,
        },
        requirement: {
          useMaxWidth: true,
        },
        mindmap: {
          useMaxWidth: true,
        },
        sankey: {
          useMaxWidth: true,
        },
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || !elementRef.current || !chart.trim()) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        const element = elementRef.current;
        if (!element) return;

        // Clear previous content
        element.innerHTML = '';

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render the diagram
        const { svg } = await mermaid.render(diagramId, chart);
        element.innerHTML = svg;

        // Make the SVG responsive
        const svgElement = element.querySelector('svg');
        if (svgElement) {
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = 'auto';
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        if (elementRef.current) {
          elementRef.current.innerHTML = `
            <div class="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">
              <p class="font-medium">Diagram Rendering Error</p>
              <p class="text-sm mt-1">${err instanceof Error ? err.message : 'Failed to render diagram'}</p>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [chart, isInitialized, id]);

  if (!chart.trim()) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-600">
        <p className="text-sm">No diagram content provided</p>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef} 
      className={`mermaid-diagram overflow-auto ${className}`}
      style={{ minHeight: '100px' }}
    />
  );
}

export default MermaidDiagram;
