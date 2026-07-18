'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '@/custom-hooks/useMe'
import { queryKeys } from '@/lib/query-keys'
import { SetupSystemAccess } from './SetupSystemAccess'
import { ManageSystemAccess } from './ManageSystemAccess'

export function SystemAccess() {
    const queryClient = useQueryClient()
    const { data } = useMe()
    const { email, isEmailVerified, emailChangeCode } = data.user

    const googleEmail =
        data.user.externalAccounts.find(acc => acc.provider === 'GOOGLE')
            ?.email ?? null
    console.log(data)
    if (email === null) {
        return (
            <SetupSystemAccess
                googleEmail={googleEmail}
                onSuccess={() =>
                    queryClient.invalidateQueries({ queryKey: queryKeys.me() })
                }
            />
        )
    }

    return (
        <ManageSystemAccess
            email={email}
            isEmailVerified={isEmailVerified}
            emailChangeCode={emailChangeCode}
            onSuccess={() =>
                queryClient.invalidateQueries({ queryKey: queryKeys.me() })
            }
        />
    )
}
