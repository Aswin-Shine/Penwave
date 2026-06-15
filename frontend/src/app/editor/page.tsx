'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  Loader2, ArrowLeft, Save, Eye, Settings, X,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link2, Image as ImageIcon, AlignLeft,
  AlignCenter, AlignRight, Undo, Redo, Minus, Upload,
  CheckCircle,
} from 'lucide-react';
import { usePostForEdit, useCreatePost, useUpdatePost } from '@/hooks/use-posts';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

const AUTOSAVE_DELAY = 4000; // ms
const DRAFT_STORAGE_KEY = (postId?: string) => `penwave:draft:${postId ?? 'new'}`;

const schema = z.object({
  title: z.string().min(1, 'A title is required.'),
  content: z.string().min(1, 'Content cannot be empty.'),
  coverImage: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).max(5).default([]),
  excerpt: z.string().max(500).optional(),
  allowComments: z.boolean().default(true),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

type FormValues = z.infer<typeof schema>;

function ToolbarBtn({ onClick, active, title, children, disabled }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={cn('p-1.5 rounded-md text-xs transition-colors duration-150',
        active ? 'bg-muted_teal-100 text-cream-900' : 'text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10',
        disabled && 'opacity-30 pointer-events-none'
      )}>
      {children}
    </button>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (v && !tags.includes(v) && tags.length < 5) { onChange([...tags, v]); setInput(''); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 text-[11px] text-celadon-400 bg-celadon-500/15 rounded-full px-2.5 py-1">
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-400 transition-colors">
              <X className="size-2.5" strokeWidth={2} />
            </button>
          </span>
        ))}
      </div>
      {tags.length < 5 && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add tag…"
            className="flex-1 bg-transparent border-b border-celadon-300/40 text-sm text-muted_teal-100 placeholder-muted_teal-300/40 focus:outline-none focus:border-muted_teal-500 pb-1 transition-colors"
          />
          <button type="button" onClick={add} className="text-xs text-muted_teal-300 hover:text-muted_teal-100 transition-colors">Add</button>
        </div>
      )}
    </div>
  );
}

// FIX H-7: SaveStatus indicator
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className={cn('text-[11px] flex items-center gap-1 transition-opacity', status === 'saving' && 'text-muted_teal-300', status === 'saved' && 'text-green-500', status === 'error' && 'text-red-400')}>
      {status === 'saving' && <><Loader2 className="size-3 animate-spin" /> Saving…</>}
      {status === 'saved' && <><CheckCircle className="size-3" /> Saved</>}
      {status === 'error' && 'Save failed'}
    </span>
  );
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const addToast = useUIStore(s => s.addToast);
  const postId = typeof params?.postId === 'string' ? params.postId : undefined;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [coverImageInput, setCoverImageInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // FIX H-7: autosave state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX H-7: draft recovery
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<FormValues | null>(null);

  const { data: post, isLoading } = usePostForEdit(postId ?? '');
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();

  const { control, register, handleSubmit, setValue, watch, getValues, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '', coverImage: '', tags: [], allowComments: true, status: 'DRAFT' },
  });

  const tags = watch('tags');
  const coverImage = watch('coverImage');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Write something legendary…' }),
      Typography, Underline, Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    editorProps: { attributes: { class: 'prose prose-teal max-w-none focus:outline-none min-h-[400px] text-muted_teal-100 font-sans font-light leading-relaxed text-lg' } },
    onUpdate: ({ editor }) => {
      setValue('content', editor.getHTML(), { shouldValidate: true });
      // FIX H-7: trigger autosave on every content change
      scheduleAutosave();
    },
  });

  // FIX H-7: autosave to localStorage
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const values = getValues();
      if (!values.title && !values.content) return;
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY(postId), JSON.stringify({ ...values, savedAt: Date.now() }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DELAY);
  }, [getValues, postId]);

  // FIX H-7: also autosave on title change
  const handleTitleChange = useCallback(() => { scheduleAutosave(); }, [scheduleAutosave]);

  // FIX H-7: on mount, check for a saved draft to recover
  useEffect(() => {
    if (draftRecovered) return;
    setDraftRecovered(true);
    const key = DRAFT_STORAGE_KEY(postId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as FormValues & { savedAt?: number };
      const ageMs = Date.now() - (saved.savedAt ?? 0);
      const ageMins = Math.round(ageMs / 60000);
      // Only offer recovery if draft is newer than 7 days and has content
      if (ageMs < 7 * 24 * 60 * 60 * 1000 && (saved.title || saved.content)) {
        setPendingRecovery(saved);
        setShowRecovery(true);
        console.log(`Draft found (${ageMins} mins ago)`);
      }
    } catch { /* ignore corrupt drafts */ }
  }, [postId, draftRecovered]);

  const acceptRecovery = () => {
    if (!pendingRecovery) return;
    reset(pendingRecovery);
    if (editor && pendingRecovery.content) editor.commands.setContent(pendingRecovery.content);
    setShowRecovery(false);
    setPendingRecovery(null);
  };

  const discardRecovery = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY(postId));
    setShowRecovery(false);
    setPendingRecovery(null);
  };

  useEffect(() => {
    if (post && editor) {
      setValue('title', post.title);
      setValue('coverImage', post.coverImage ?? '');
      setValue('tags', post.tags.map(({ tag }) => tag.name));
      setValue('excerpt', post.excerpt ?? '');
      setValue('allowComments', post.allowComments);
      const safeContent = post.content ?? '';
      setValue('content', safeContent);
      if (editor.getHTML() !== safeContent) editor.commands.setContent(safeContent);
    }
  }, [post, setValue, editor]);

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Backend JSON limit is 1MB; base64 inflates by ~33% so cap source file at 700KB
    if (file.size > 700 * 1024) {
      addToast({
        title: 'Image too large',
        description: 'Cover image must be under 700 KB. Resize it and try again.',
        variant: 'error',
      });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { const url = reader.result as string; setValue('coverImage', url); setCoverImageInput(url); };
    reader.readAsDataURL(file);
  };

  const handleInsertImage = () => {
    const url = window.prompt('Image URL:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  };

  const handleSetLink = () => {
    const prev = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL:', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href: url }).run();
  };

  const onSubmit = (status: 'DRAFT' | 'PUBLISHED') => handleSubmit(data => {
    const payload = { ...data, status };
    if (postId) {
      updateMutation.mutate({ id: postId, payload }, {
        onSuccess: () => {
          // FIX H-7: clear autosave draft on successful publish/update
          localStorage.removeItem(DRAFT_STORAGE_KEY(postId));
          addToast({ title: status === 'PUBLISHED' ? 'Post published!' : 'Draft saved.', variant: 'success' });
          if (status === 'PUBLISHED') router.push('/dashboard');
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: res => {
          localStorage.removeItem(DRAFT_STORAGE_KEY(undefined));
          addToast({ title: status === 'PUBLISHED' ? 'Published!' : 'Draft saved.', variant: 'success' });
          if (status === 'PUBLISHED' && res.data?.slug) router.push(`/post/${res.data.slug}`);
        },
      });
    }
  })();

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (postId && isLoading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted_teal-300" />
        <span className="text-xs font-sans tracking-widest uppercase text-muted_teal-300/60">Loading post...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-900 text-muted_teal-100 pb-24">
      {/* FIX H-7: Draft recovery banner */}
      {showRecovery && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4 text-sm text-amber-800">
          <span>⚡ Unsaved draft recovered. Restore it?</span>
          <div className="flex gap-2">
            <button onClick={acceptRecovery} className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs hover:bg-amber-700 transition-colors">Restore</button>
            <button onClick={discardRecovery} className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs hover:bg-amber-200 transition-colors">Discard</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={cn('sticky z-40 bg-cream-900/90 backdrop-blur-md border-b border-celadon-300/10', showRecovery ? 'top-[48px]' : 'top-[72px]')}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted_teal-300 hover:text-muted_teal-100 transition-colors shrink-0">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {editor && !previewMode && (
            <div className="flex items-center gap-0.5 overflow-x-auto">
              <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}><Undo className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}><Redo className="size-3.5" /></ToolbarBtn>
              <div className="w-px h-4 bg-celadon-300/20 mx-1" />
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 className="size-3.5" /></ToolbarBtn>
              <div className="w-px h-4 bg-celadon-300/20 mx-1" />
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><span className="text-[10px] font-bold">H</span></ToolbarBtn>
              <div className="w-px h-4 bg-celadon-300/20 mx-1" />
              <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center"><AlignCenter className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight className="size-3.5" /></ToolbarBtn>
              <div className="w-px h-4 bg-celadon-300/20 mx-1" />
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list"><ListOrdered className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code"><Code className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><span className="text-[9px] font-mono font-bold">{'{}'}</span></ToolbarBtn>
              <ToolbarBtn onClick={handleSetLink} active={editor.isActive('link')} title="Add link"><Link2 className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={handleInsertImage} title="Insert image URL"><ImageIcon className="size-3.5" /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus className="size-3.5" /></ToolbarBtn>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {/* FIX H-7: autosave status indicator */}
            <SaveIndicator status={saveStatus} />
            <button type="button" onClick={() => setPreviewMode(p => !p)} title="Preview"
              className={cn('p-2 rounded-full transition-colors', previewMode ? 'bg-muted_teal-100 text-cream-900' : 'hover:bg-celadon-500/10 text-muted_teal-300 hover:text-muted_teal-100')}>
              <Eye className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setSettingsOpen(p => !p)} title="Post settings"
              className={cn('p-2 rounded-full transition-colors', settingsOpen ? 'bg-muted_teal-100 text-cream-900' : 'hover:bg-celadon-500/10 text-muted_teal-300 hover:text-muted_teal-100')}>
              <Settings className="h-4 w-4" />
            </button>
            <div className="w-[1px] h-4 bg-celadon-300/20 mx-1" />
            <button type="button" onClick={() => onSubmit('DRAFT')} disabled={isPending}
              className="text-muted_teal-300 hover:text-muted_teal-100 text-xs font-medium px-3 py-2 rounded-full hover:bg-celadon-500/10 transition-colors disabled:opacity-50">
              Save draft
            </button>
            <button type="button" onClick={() => onSubmit('PUBLISHED')} disabled={isPending}
              className="bg-muted_teal-100 hover:bg-muted_teal-200 disabled:opacity-50 text-cream-900 font-medium text-xs tracking-wider uppercase px-5 py-2.5 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-sm">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{postId ? 'Update' : 'Publish'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex">
        <main className={cn('flex-1 min-w-0 transition-all duration-300', settingsOpen && 'mr-80')}>
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="mb-8">
              {coverImage ? (
                <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full hover:bg-white/30 transition-colors">Change image</button>
                    <button type="button" onClick={() => setValue('coverImage', '')} className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full hover:bg-red-500/50 transition-colors">Remove</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="group w-full aspect-[21/9] rounded-2xl bg-celadon-500/5 border border-dashed border-celadon-300/30 flex flex-col items-center justify-center gap-2 hover:bg-celadon-500/10 hover:border-celadon-300/50 transition-all duration-300">
                  <div className="p-3 rounded-full bg-cream-900/60 text-muted_teal-300 group-hover:scale-105 transition-transform duration-300"><Upload className="h-5 w-5" /></div>
                  <span className="text-sm font-medium text-muted_teal-300">Click to add cover image</span>
                  <span className="text-xs text-muted_teal-300/50">or paste a URL in settings</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
            </div>

            {/* Title — autosave on change */}
            <div className="mb-8">
              <input
                type="text"
                autoFocus={!postId}
                placeholder="Title your frequency..."
                className="w-full bg-transparent border-none text-4xl sm:text-5xl font-serif font-normal tracking-tight text-muted_teal-100 focus:outline-none placeholder-muted_teal-300/25"
                {...register('title', { onChange: handleTitleChange })}
              />
              <div className="h-[1px] mt-3 w-full bg-gradient-to-r from-celadon-300/20 via-celadon-300/5 to-transparent" />
            </div>

            {previewMode ? (
              <div
                className="prose prose-teal max-w-none font-serif text-muted_teal-100/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: getValues('content') }}
              />
            ) : (
              <Controller name="content" control={control} render={() => <EditorContent editor={editor} />} />
            )}
          </div>
        </main>

        {settingsOpen && (
          <aside className="fixed right-0 top-[72px] bottom-0 w-80 bg-cream-900 border-l border-celadon-300/15 overflow-y-auto z-30 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm text-muted_teal-100">Post settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-muted_teal-300 hover:text-muted_teal-100 transition-colors"><X className="size-4" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted_teal-300/80 font-semibold">Cover image URL</label>
              <input
                value={coverImageInput}
                onChange={e => { setCoverImageInput(e.target.value); setValue('coverImage', e.target.value); scheduleAutosave(); }}
                placeholder="https://..."
                className="w-full bg-transparent border-b border-celadon-300/40 text-sm text-muted_teal-100 placeholder-muted_teal-300/40 focus:outline-none focus:border-muted_teal-500 pb-1.5 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted_teal-300/80 font-semibold">Excerpt</label>
              <textarea rows={3} placeholder="Short description..." className="w-full bg-transparent border border-celadon-300/20 rounded-xl text-sm text-muted_teal-100 placeholder-muted_teal-300/40 focus:outline-none focus:border-muted_teal-500 p-3 resize-none transition-colors"
                {...register('excerpt', { onChange: scheduleAutosave })} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted_teal-300/80 font-semibold">Tags (up to 5)</label>
              <TagInput tags={tags} onChange={t => { setValue('tags', t); scheduleAutosave(); }} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded" {...register('allowComments')} />
              <span className="text-sm text-muted_teal-300">Allow comments</span>
            </label>
          </aside>
        )}
      </div>
    </div>
  );
}
