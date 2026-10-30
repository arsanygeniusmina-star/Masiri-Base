import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react';
import type { BibleBook, BiblePassageSelection, BibleTestament, BibleVerse } from '../../types';
import { BIBLE_BOOKS, TESTAMENT_LABELS, searchBibleBooks } from '../../lib/bible/books';
import {
  buildPassageSelection,
  fetchBibleChapter,
  formatBibleReference,
  prefetchBibleChapter,
  toArabicDigits,
  arabicCount,
} from '../../lib/bible/bibleService';
import { chipStyle, primaryButtonStyle, readingPalette, secondaryButtonStyle } from '../readings/readingTheme';

interface FullBibleNavigatorProps {
  theme: 'light' | 'dark';
  /** When provided, shows the "Assign this passage" action for servants. */
  onAssignPassage?: (selection: BiblePassageSelection) => void;
  initialBookId?: string;
  initialChapter?: number;
}

type Range = { start: number; end: number } | null;

/**
 * Full Arabic Bible reader for servants (adapted from masiri-main's FullBibleNavigator).
 * - Old/New Testament navigation, book search and chapter grid
 * - Contiguous verse-range selection (tap first verse, then last verse)
 * - Arabic reference formatting, e.g. «إنجيل يوحنا ٣:١٦–١٨»
 */
export const FullBibleNavigator: React.FC<FullBibleNavigatorProps> = ({
  theme,
  onAssignPassage,
  initialBookId = 'john',
  initialChapter = 1,
}) => {
  const p = readingPalette(theme);
  const [testament, setTestament] = useState<BibleTestament | 'ALL'>('NT');
  const [bookQuery, setBookQuery] = useState('');
  const [book, setBook] = useState<BibleBook>(() => BIBLE_BOOKS.find((item) => item.id === initialBookId) ?? BIBLE_BOOKS[42]);
  const [chapter, setChapter] = useState(initialChapter);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [range, setRange] = useState<Range>(null);
  const [copied, setCopied] = useState(false);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const versesTopRef = useRef<HTMLDivElement | null>(null);

  const filteredBooks = useMemo(() => searchBibleBooks(bookQuery, testament), [bookQuery, testament]);
  const groupedBooks = useMemo(() => {
    const groups: { category: string; books: BibleBook[] }[] = [];
    for (const item of filteredBooks) {
      const last = groups[groups.length - 1];
      if (last && last.category === item.category) last.books.push(item);
      else groups.push({ category: item.category, books: [item] });
    }
    return groups;
  }, [filteredBooks]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setRange(null);
    fetchBibleChapter(book, chapter)
      .then((result) => {
        if (cancelled) return;
        setVerses(result);
        setLoading(false);
        prefetchBibleChapter(book, chapter + 1);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setVerses([]);
        setLoading(false);
        setLoadError(error instanceof Error ? error.message : 'تعذر تحميل الإصحاح.');
      });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, reloadToken]);

  const selection: BiblePassageSelection | null = useMemo(() => {
    if (!range || verses.length === 0) return null;
    return buildPassageSelection(book, chapter, verses, range.start, range.end);
  }, [book, chapter, verses, range]);

  const selectBook = (next: BibleBook) => {
    setBook(next);
    setChapter(1);
    setMobilePickerOpen(false);
  };

  const goToChapter = (next: number) => {
    if (next < 1 || next > book.totalChapters) return;
    setChapter(next);
    versesTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToPreviousChapter = () => {
    if (chapter > 1) return goToChapter(chapter - 1);
    const index = BIBLE_BOOKS.findIndex((item) => item.id === book.id);
    if (index > 0) {
      const previousBook = BIBLE_BOOKS[index - 1];
      setBook(previousBook);
      setChapter(previousBook.totalChapters);
    }
  };

  const goToNextChapter = () => {
    if (chapter < book.totalChapters) return goToChapter(chapter + 1);
    const index = BIBLE_BOOKS.findIndex((item) => item.id === book.id);
    if (index >= 0 && index < BIBLE_BOOKS.length - 1) {
      setBook(BIBLE_BOOKS[index + 1]);
      setChapter(1);
    }
  };

  const handleVerseClick = (number: number) => {
    setRange((current) => {
      if (!current) return { start: number, end: number };
      if (current.start === current.end && number !== current.start) {
        return { start: Math.min(current.start, number), end: Math.max(current.start, number) };
      }
      if (current.start === current.end && number === current.start) return null;
      return { start: number, end: number };
    });
  };

  const selectWholeChapter = () => {
    if (verses.length === 0) return;
    setRange({ start: verses[0].number, end: verses[verses.length - 1].number });
  };

  const copySelection = async () => {
    if (!selection) return;
    const text = `${selection.verses.map((verse) => `(${toArabicDigits(verse.number)}) ${verse.text}`).join(' ')}\n— ${selection.reference}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const isSelected = (number: number) => Boolean(range && number >= range.start && number <= range.end);

  const bookPicker = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="اختيار العهد">
        {(['OT', 'NT', 'ALL'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={testament === value}
            onClick={() => setTestament(value)}
            className="rounded-xl px-2 py-2 text-xs font-bold transition-colors"
            style={chipStyle(p, testament === value)}
          >
            {value === 'ALL' ? 'الكل' : TESTAMENT_LABELS[value]}
          </button>
        ))}
      </div>
      <label className="relative block">
        <span className="sr-only">ابحث عن سفر</span>
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: p.muted }} />
        <input
          value={bookQuery}
          onChange={(event) => setBookQuery(event.target.value)}
          placeholder="ابحث عن سفر... (مثال: يوحنا)"
          className="liquid-glass-input w-full rounded-xl py-2.5 pr-9 pl-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
          style={{ color: p.text }}
        />
      </label>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pl-1" style={{ maxHeight: '26rem' }}>
        {groupedBooks.length === 0 && (
          <p className="py-6 text-center text-xs" style={{ color: p.muted }}>لا يوجد سفر بهذا الاسم.</p>
        )}
        {groupedBooks.map((group) => (
          <div key={group.category} className="space-y-1">
            <p className="px-1 text-[11px] font-bold" style={{ color: p.accent }}>{group.category}</p>
            {group.books.map((item) => {
              const active = item.id === book.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectBook(item)}
                  aria-current={active ? 'true' : undefined}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-right text-sm transition-colors"
                  style={{
                    backgroundColor: active ? p.soft : 'transparent',
                    color: active ? p.accentText : p.text,
                    border: `1px solid ${active ? p.softBorder : 'transparent'}`,
                    fontWeight: active ? 800 : 600,
                  }}
                >
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 text-[10px]" style={{ color: p.muted }}>{toArabicDigits(item.totalChapters)} ص</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" dir="rtl">
      {/* Book list (desktop) */}
      <aside className="liquid-glass-card hidden rounded-3xl p-4 lg:col-span-4 lg:block xl:col-span-3">
        {bookPicker}
      </aside>

      <section className="space-y-4 lg:col-span-8 xl:col-span-9">
        {/* Header: current book + chapter navigation */}
        <div className="liquid-glass-card space-y-4 rounded-3xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: p.soft, color: p.accentText }}>
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold" style={{ color: p.accent }}>{TESTAMENT_LABELS[book.testament]} · {book.category}</p>
                <h2 className="truncate text-lg font-black sm:text-xl" style={{ color: p.text }}>
                  {formatBibleReference(book.name, chapter)}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobilePickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold lg:hidden"
                style={secondaryButtonStyle(p)}
              >
                <Layers className="h-4 w-4" />
                الأسفار
              </button>
              <button
                type="button"
                onClick={goToPreviousChapter}
                aria-label="الإصحاح السابق"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={secondaryButtonStyle(p)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNextChapter}
                aria-label="الإصحاح التالي"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={secondaryButtonStyle(p)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold" style={{ color: p.muted }}>الإصحاحات</p>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {Array.from({ length: book.totalChapters }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => goToChapter(number)}
                  aria-current={number === chapter ? 'true' : undefined}
                  className="h-9 min-w-9 rounded-xl px-2 text-xs font-bold transition-colors"
                  style={chipStyle(p, number === chapter)}
                >
                  {toArabicDigits(number)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Verses */}
        <div ref={versesTopRef} className="liquid-glass-card rounded-3xl p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: p.divider }}>
            <p className="text-xs font-semibold" style={{ color: p.muted }}>
              {onAssignPassage ? 'اضغط على أول آية ثم آخر آية لتحديد المقطع المراد تعيينه.' : 'اضغط على أول آية ثم آخر آية لتحديد مقطع.'}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={selectWholeChapter} disabled={verses.length === 0} className="rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={secondaryButtonStyle(p)}>
                الإصحاح كله
              </button>
              {range && (
                <button type="button" onClick={() => setRange(null)} className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold" style={secondaryButtonStyle(p)}>
                  <X className="h-3.5 w-3.5" />
                  إلغاء التحديد
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 py-10" role="status">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: p.accent }} />
              <p className="text-sm" style={{ color: p.muted }}>جاري تحميل الإصحاح...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center gap-3 rounded-2xl p-6 text-center" style={{ backgroundColor: p.errorSoft }} role="alert">
              <p className="text-sm font-bold" style={{ color: p.error }}>{loadError}</p>
              <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold" style={primaryButtonStyle(p)}>
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <ol className="space-y-1.5" aria-label={`آيات ${formatBibleReference(book.name, chapter)}`}>
              {verses.map((verse) => {
                const selected = isSelected(verse.number);
                const edge = range && (verse.number === range.start || verse.number === range.end);
                return (
                  <li key={verse.number}>
                    <button
                      type="button"
                      onClick={() => handleVerseClick(verse.number)}
                      aria-pressed={selected}
                      className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
                      style={{
                        backgroundColor: selected ? p.goldSoft : 'transparent',
                        border: `1px solid ${edge ? p.accent : selected ? p.softBorder : 'transparent'}`,
                      }}
                    >
                      <span
                        className="mt-1 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-black"
                        style={{ backgroundColor: selected ? p.primary : p.soft, color: selected ? '#F3DEAB' : p.accentText }}
                      >
                        {toArabicDigits(verse.number)}
                      </span>
                      <span className="text-base leading-9 sm:text-lg" style={{ color: p.text }}>{verse.text}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Selection action bar */}
        {selection && (
          <div
            className="sticky bottom-24 z-30 flex flex-col gap-3 rounded-3xl border p-4 shadow-2xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between md:bottom-4"
            style={{ backgroundColor: p.surface, borderColor: p.softBorder }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold" style={{ color: p.muted }}>المقطع المحدد — {arabicCount(selection.verses.length, 'آية', 'آيتان', 'آيات')}</p>
              <p className="truncate text-base font-black" style={{ color: p.accentText }}>{selection.reference}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void copySelection()} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold" style={secondaryButtonStyle(p)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
              {onAssignPassage && (
                <button
                  type="button"
                  onClick={() => onAssignPassage(selection)}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                  style={primaryButtonStyle(p)}
                >
                  <Send className="h-4 w-4" />
                  تعيين هذا النص
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Mobile book picker sheet */}
      {mobilePickerOpen && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[70] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="اختيار السفر">
          <button type="button" className="absolute inset-0" style={{ backgroundColor: p.overlay }} aria-label="إغلاق" onClick={() => setMobilePickerOpen(false)} />
          <div className="relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-3xl border p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" style={{ backgroundColor: p.surface, borderColor: p.border }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black" style={{ color: p.text }}>اختر السفر</h3>
              <button type="button" onClick={() => setMobilePickerOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl" style={secondaryButtonStyle(p)} aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>
            {bookPicker}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
