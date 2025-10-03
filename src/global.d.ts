import type {
    DrivePickerElement,
    DrivePickerDocsViewElement,
    DrivePickerElementProps,
    DrivePickerDocsViewElementProps,
} from '@googleworkspace/drive-picker-element'

declare global {
    interface Window {
        gtag: (
            command: 'config' | 'set' | 'event',
            targetId: string,
            parameters?: { [key: string]: any } | null,
        ) => void
    }

    namespace React.JSX {
        interface IntrinsicElements {
            'drive-picker': React.DetailedHTMLProps<
                React.HTMLAttributes<DrivePickerElement> &
                    DrivePickerElementProps,
                DrivePickerElement
            >
            'drive-picker-docs-view': React.DetailedHTMLProps<
                React.HTMLAttributes<DrivePickerDocsViewElement> &
                    DrivePickerDocsViewElementProps,
                DrivePickerDocsViewElement
            >
        }
    }
}

export {}
