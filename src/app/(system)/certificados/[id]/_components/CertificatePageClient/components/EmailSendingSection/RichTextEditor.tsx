'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ListItemNode, ListNode } from '@lexical/list'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import {
    InitialConfigType,
    LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $patchStyleText } from '@lexical/selection'
import { mergeRegister } from '@lexical/utils'
import {
    $getRoot,
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    UNDO_COMMAND,
} from 'lexical'
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Italic,
    Redo2,
    Strikethrough,
    Underline,
    Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const FONT_SIZES = [
    '8',
    '10',
    '12',
    '14',
    '16',
    '18',
    '20',
    '24',
    '30',
    '36',
    '48',
]

const FONT_FAMILIES: { label: string; value: string }[] = [
    { label: 'Padrão', value: 'default' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
]

const editorTheme = {
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
    },
}

function Toolbar({ disabled }: { disabled?: boolean }) {
    const [editor] = useLexicalComposerContext()
    const [isBold, setIsBold] = useState(false)
    const [isItalic, setIsItalic] = useState(false)
    const [isUnderline, setIsUnderline] = useState(false)
    const [isStrikethrough, setIsStrikethrough] = useState(false)
    const [textAlign, setTextAlign] = useState('left')
    const [fontSize, setFontSize] = useState('16')
    const [fontFamily, setFontFamily] = useState('default')
    const [textColor, setTextColor] = useState('#000000')
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const colorSwatchRef = useRef<HTMLSpanElement>(null)
    const colorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                CAN_UNDO_COMMAND,
                payload => {
                    setCanUndo(payload)
                    return false
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            editor.registerCommand(
                CAN_REDO_COMMAND,
                payload => {
                    setCanRedo(payload)
                    return false
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    const selection = $getSelection()
                    if (!$isRangeSelection(selection)) return

                    setIsBold(selection.hasFormat('bold'))
                    setIsItalic(selection.hasFormat('italic'))
                    setIsUnderline(selection.hasFormat('underline'))
                    setIsStrikethrough(selection.hasFormat('strikethrough'))

                    const anchorNode = selection.anchor.getNode()
                    if (anchorNode.getKey() !== 'root') {
                        try {
                            const topElement =
                                anchorNode.getTopLevelElementOrThrow()
                            setTextAlign(topElement.getFormatType() || 'left')
                        } catch {
                            /* ignore */
                        }
                    }

                    const nodes = selection.getNodes()
                    const firstText = nodes.find($isTextNode)
                    if (firstText && $isTextNode(firstText)) {
                        const style = firstText.getStyle() || ''

                        const fontSizeMatch = style.match(
                            /font-size:\s*(\d+(?:\.\d+)?)px/,
                        )
                        if (fontSizeMatch) setFontSize(fontSizeMatch[1])

                        const fontFamilyMatch = style.match(
                            /font-family:\s*([^;]+)/,
                        )
                        if (fontFamilyMatch) {
                            const fam = fontFamilyMatch[1]
                                .trim()
                                .replace(/['"]/g, '')
                            const found = FONT_FAMILIES.find(
                                f => f.value === fam,
                            )
                            setFontFamily(found ? found.value : 'default')
                        } else {
                            setFontFamily('default')
                        }

                        const colorMatch = style.match(
                            /color:\s*(#[0-9a-fA-F]{3,8})/,
                        )
                        if (colorMatch) setTextColor(colorMatch[1])
                    }
                })
            }),
        )
    }, [editor])

    const applyStyle = useCallback(
        (styles: Record<string, string>) => {
            editor.update(() => {
                const selection = $getSelection()
                if ($isRangeSelection(selection)) {
                    $patchStyleText(selection, styles)
                }
            })
        },
        [editor],
    )

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-0.5 gap-y-1 border-b p-1',
                disabled && 'pointer-events-none opacity-50',
            )}
        >
            {/* Undo / Redo */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canUndo}
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                title="Desfazer (Ctrl+Z)"
            >
                <Undo2 className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canRedo}
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                title="Refazer (Ctrl+Y)"
            >
                <Redo2 className="h-4 w-4" />
            </Button>

            <div className="mx-0.5 h-5 w-px bg-border" />

            {/* Font family */}
            <Select
                value={fontFamily}
                onValueChange={val => {
                    setFontFamily(val)
                    applyStyle({
                        'font-family': val === 'default' ? '' : val,
                    })
                }}
            >
                <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                    {FONT_FAMILIES.map(f => (
                        <SelectItem
                            key={f.value}
                            value={f.value}
                            className="text-xs"
                            style={{
                                fontFamily:
                                    f.value === 'default' ? undefined : f.value,
                            }}
                        >
                            {f.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Font size */}
            <Select
                value={fontSize}
                onValueChange={val => {
                    setFontSize(val)
                    applyStyle({ 'font-size': `${val}px` })
                }}
            >
                <SelectTrigger className="h-7 w-17 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {FONT_SIZES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">
                            {s}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="mx-0.5 h-5 w-px bg-border" />

            {/* Format buttons */}
            <Button
                type="button"
                variant={isBold ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
                }
                title="Negrito (Ctrl+B)"
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant={isItalic ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
                }
                title="Itálico (Ctrl+I)"
            >
                <Italic className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant={isUnderline ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
                }
                title="Sublinhado (Ctrl+U)"
            >
                <Underline className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant={isStrikethrough ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
                }
                title="Tachado"
            >
                <Strikethrough className="h-4 w-4" />
            </Button>

            <div className="mx-0.5 h-5 w-px bg-border" />

            {/* Text color */}
            <label
                className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
                title="Cor do texto"
            >
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-sm font-bold leading-none">A</span>
                    <span
                        ref={colorSwatchRef}
                        className="h-1 w-3.5 rounded-sm"
                        style={{ backgroundColor: textColor }}
                    />
                </div>
                <input
                    type="color"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    value={textColor}
                    onChange={e => {
                        const color = e.target.value
                        if (colorSwatchRef.current) {
                            colorSwatchRef.current.style.backgroundColor = color
                        }
                        if (colorDebounceRef.current)
                            clearTimeout(colorDebounceRef.current)
                        colorDebounceRef.current = setTimeout(() => {
                            setTextColor(color)
                            applyStyle({ color })
                        }, 80)
                    }}
                />
            </label>

            <div className="mx-0.5 h-5 w-px bg-border" />

            {/* Alignment */}
            <Button
                type="button"
                variant={
                    !textAlign || textAlign === 'left' || textAlign === 'start'
                        ? 'secondary'
                        : 'ghost'
                }
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')
                }
                title="Alinhar à esquerda"
            >
                <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant={textAlign === 'center' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')
                }
                title="Centralizar"
            >
                <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant={
                    textAlign === 'right' || textAlign === 'end'
                        ? 'secondary'
                        : 'ghost'
                }
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')
                }
                title="Alinhar à direita"
            >
                <AlignRight className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant={textAlign === 'justify' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')
                }
                title="Justificar"
            >
                <AlignJustify className="h-4 w-4" />
            </Button>
        </div>
    )
}

function EditablePlugin({ editable }: { editable: boolean }) {
    const [editor] = useLexicalComposerContext()
    useEffect(() => {
        editor.setEditable(editable)
    }, [editor, editable])
    return null
}

function InitialHtmlPlugin({ initialHtml }: { initialHtml?: string }) {
    const [editor] = useLexicalComposerContext()
    const initialHtmlRef = useRef(initialHtml)

    useEffect(() => {
        const html = initialHtmlRef.current
        if (!html) return

        editor.update(() => {
            const parsed = html.trimStart().startsWith('<')
                ? html
                : `<p>${html}</p>`
            const parser = new DOMParser()
            const dom = parser.parseFromString(parsed, 'text/html')
            const nodes = $generateNodesFromDOM(editor, dom)
            const root = $getRoot()
            root.clear()
            if (nodes.length > 0) root.append(...nodes)
        })
    }, [editor])

    return null
}

function OnHtmlChangePlugin({
    onChange,
}: {
    onChange: (html: string) => void
}) {
    const [editor] = useLexicalComposerContext()
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    })
    const handleChange = useCallback(
        (editorState: { read: (fn: () => void) => void }) => {
            editorState.read(() => {
                onChangeRef.current($generateHtmlFromNodes(editor, null))
            })
        },
        [editor],
    )
    return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
}

export interface RichTextEditorProps {
    value?: string
    onChange?: (html: string) => void
    placeholder?: string
    disabled?: boolean
    hasError?: boolean
    className?: string
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Digite o corpo do email...',
    disabled = false,
    hasError = false,
    className,
}: RichTextEditorProps) {
    const editorConfig = useMemo<InitialConfigType>(
        () => ({
            namespace: 'EmailBodyEditor',
            theme: editorTheme,
            nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
            onError: (error: Error) => console.error(error),
            editable: !disabled,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    return (
        <div
            className={cn(
                'rounded-md border bg-transparent text-sm ring-offset-background',
                'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                hasError && 'border-destructive',
                disabled && 'cursor-not-allowed opacity-50',
                className,
            )}
        >
            <LexicalComposer initialConfig={editorConfig}>
                <Toolbar disabled={disabled} />
                <div className="relative">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable className="min-h-32 px-3 py-2 outline-none" />
                        }
                        placeholder={
                            <div className="pointer-events-none absolute left-3 top-2 select-none text-muted-foreground">
                                {placeholder}
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <ListPlugin />
                <HistoryPlugin />
                <EditablePlugin editable={!disabled} />
                <InitialHtmlPlugin initialHtml={value} />
                {onChange && <OnHtmlChangePlugin onChange={onChange} />}
            </LexicalComposer>
        </div>
    )
}
