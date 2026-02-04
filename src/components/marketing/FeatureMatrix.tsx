import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Check, Minus } from "lucide-react";

export function FeatureMatrix() {
    const features = [
        { category: "Data & Storage" },
        { name: "CSV Uploads", free: "5/month", pro: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
        { name: "Max File Size", free: "5MB", pro: "50MB", business: "200MB", enterprise: "1GB" },
        { name: "Storage", free: "100MB", pro: "5GB", business: "25GB/seat", enterprise: "Unlimited" },
        { name: "Retention", free: "30 days", pro: "1 year", business: "3 years", enterprise: "Custom" },

        { category: "AI Insights" },
        { name: "AI Chats", free: "20/mo", pro: "300/mo", business: "1,000/seat", enterprise: "Unlimited" },
        { name: "Model", free: "Llama 3.1 8B", pro: "Llama 3.1 8B+", business: "Llama 3.1 (High CTX)", enterprise: "GPT-4 / Claude" },
        { name: "Data Summaries", free: "3/mo", pro: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },

        { category: "Dashboards" },
        { name: "Styles", free: "Simple", pro: "All (inc. PowerBI)", business: "All + Custom", enterprise: "White-label" },
        { name: "Exports (PNG/PDF)", free: "Watermarked", pro: "Clean", business: "Clean + Branding", enterprise: "Custom Branding" },

        { category: "Collaboration" },
        { name: "Organizations", free: "1", pro: "3", business: "10", enterprise: "Unlimited" },
        { name: "Members/Org", free: "3", pro: "10", business: "50", enterprise: "Unlimited" },

        { category: "Support & Security" },
        { name: "Support", free: "Community", pro: "Email (48h)", business: "Priority (24h)", enterprise: "Dedicated + SLA" },
        { name: "Audit Logs", free: false, pro: false, business: "90 days", enterprise: "Unlimited" },
        { name: "SSO / SAML", free: false, pro: false, business: false, enterprise: true },
    ];

    return (
        <section className="py-16 bg-white dark:bg-slate-950">
            <div className="container mx-auto px-4 max-w-7xl">
                <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[300px] text-lg font-bold text-slate-900 dark:text-white">Features</TableHead>
                                <TableHead className="text-center text-lg font-bold text-slate-900 dark:text-white min-w-[140px]">Free</TableHead>
                                <TableHead className="text-center text-lg font-bold text-brand-purple min-w-[140px]">Pro</TableHead>
                                <TableHead className="text-center text-lg font-bold text-slate-900 dark:text-white min-w-[140px]">Business</TableHead>
                                <TableHead className="text-center text-lg font-bold text-slate-900 dark:text-white min-w-[140px]">Enterprise</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {features.map((item, idx) => (
                                item.category ? (
                                    <TableRow key={idx} className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50">
                                        <TableCell colSpan={5} className="font-semibold text-slate-500 uppercase tracking-wider py-4 pl-4">
                                            {item.category}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium pl-4">{item.name}</TableCell>
                                        <TableCell className="text-center text-slate-600 dark:text-slate-400">
                                            {renderCell(item.free)}
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-brand-purple bg-brand-purple/5">
                                            {renderCell(item.pro)}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-600 dark:text-slate-400">
                                            {renderCell(item.business)}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-600 dark:text-slate-400">
                                            {renderCell(item.enterprise)}
                                        </TableCell>
                                    </TableRow>
                                )
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </section>
    );
}

function renderCell(value: string | boolean | undefined) {
    if (value === true) return <Check className="w-5 h-5 mx-auto text-emerald-500" />;
    if (value === false) return <Minus className="w-5 h-5 mx-auto text-slate-300" />;
    return value;
}
