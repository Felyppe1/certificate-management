import { Skeleton } from '@/components/ui/skeleton'

export function CertificateEmissionsLoading() {
    return (
        <div className="divide-y">
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="flex items-center justify-between py-6 px-2"
                >
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-[200px]" />
                        <Skeleton className="h-4 w-[280px]" />
                    </div>

                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-[100px] rounded-full" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    )
}
