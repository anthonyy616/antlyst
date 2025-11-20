export default function PowerBIEngine({ projectId }: { projectId: string }) {
    return (
        <div className="w-full h-[800px] bg-slate-50 border rounded-lg flex items-center justify-center">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Power BI Style Engine</h3>
                <p className="text-slate-500">Evidence.dev Embed for Project {projectId}</p>
                {/* Iframe would go here */}
            </div>
        </div>
    );
}
