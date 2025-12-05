import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card>
                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Skeleton className="h-6 w-64 mb-2" />
                            <Skeleton className="h-12 w-24" />
                        </div>
                    </div>

                    <div className="flex flex-wrap divide-x divide-muted-foreground/25 gap-12 mb-3">
                        <div className="flex flex-col shrink-0 pr-12">
                            <Skeleton className="h-5 w-20 mb-1" />
                            <Skeleton className="h-9 w-12" />
                        </div>

                        <div className="flex flex-col shrink-0">
                            <Skeleton className="h-5 w-24 mb-1" />
                            <Skeleton className="h-9 w-12" />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-1">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-16 ml-1" />
                        <Skeleton className="h-5 w-40 ml-2" />
                    </div>
                </div>
            </Card>

            <Card>
                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-6 w-48 mb-1" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                            <Skeleton className="h-12 w-24 mt-1" />
                        </div>
                    </div>

                    <div className="flex flex-wrap divide-x divide-muted-foreground/25 gap-12 mb-3">
                        <div className="flex flex-col shrink-0 pr-12">
                            <Skeleton className="h-5 w-20 mb-1" />
                            <Skeleton className="h-9 w-12" />
                        </div>

                        <div className="flex flex-col shrink-0">
                            <Skeleton className="h-5 w-24 mb-1" />
                            <Skeleton className="h-9 w-12" />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-16 ml-1" />
                        <Skeleton className="h-5 w-40 ml-2" />
                    </div>
                </div>
            </Card>
        </div>
    )
}
