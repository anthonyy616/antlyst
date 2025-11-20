export default function SimpleEngine({ projectId }: { projectId: string }) {
    return (
        <div className="w-full h-[800px] bg-slate-50 border rounded-lg flex items-center justify-center">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Simple Engine (Lightdash)</h3>
                <p className="text-slate-500">Embedding for Project {projectId}</p>
                {/* Iframe would go here */}
            </div>
        </div>
    );
}
