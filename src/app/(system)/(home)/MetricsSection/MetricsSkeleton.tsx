import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3 md:gap-6 mb-4 sm:mb-6 md:mb-10">
            {[1, 2].map(i => (
                <Card
                    key={i}
                    className="flex flex-col justify-between p-6 h-full gap-0 md:gap-0"
                >
                    <div>
                        <div className="flex gap-6 mb-3">
                            <Skeleton className="h-5 w-[60%]" />
                            <Skeleton className="h-10 w-18 sm:h-12 sm:w-24 rounded-lg mb-4" />
                        </div>

                        <Skeleton className="h-[80px] w-full rounded-md mt-3" />
                    </div>
                </Card>
            ))}
        </div>
    )
}
