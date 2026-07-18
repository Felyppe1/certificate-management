import { GetMeResponse } from '@/app/api/users/me/route'
import { ApiError } from '@/app/api/_utils/api-error'

export async function fetchMe(): Promise<GetMeResponse> {
    const response = await fetch('/api/users/me')

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}
