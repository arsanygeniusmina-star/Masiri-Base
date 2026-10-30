import type { BibleBook, BibleTestament } from '../../types';

/**
 * The 66 books of the Bible with Arabic (Van Dyck / SVD) names.
 * Reused from the legacy masiri-main `bibleData.ts`; ids match `public.reading_bible_books`.
 */
export const BIBLE_BOOKS: BibleBook[] = [
  { id: "gen", name: "سفر التكوين", shortName: "التكوين", altNames: ["التكوين","تك"], testament: "OT", category: "شريعة موسى (التوراة)", totalChapters: 50, bollsNumber: 1 },
  { id: "exod", name: "سفر الخروج", shortName: "الخروج", altNames: ["الخروج","خر"], testament: "OT", category: "شريعة موسى (التوراة)", totalChapters: 40, bollsNumber: 2 },
  { id: "lev", name: "سفر اللاويين", shortName: "اللاويين", altNames: ["اللاويين","لا"], testament: "OT", category: "شريعة موسى (التوراة)", totalChapters: 27, bollsNumber: 3 },
  { id: "num", name: "سفر العدد", shortName: "العدد", altNames: ["العدد","عد"], testament: "OT", category: "شريعة موسى (التوراة)", totalChapters: 36, bollsNumber: 4 },
  { id: "deut", name: "سفر التثنية", shortName: "التثنية", altNames: ["التثنية","تث"], testament: "OT", category: "شريعة موسى (التوراة)", totalChapters: 34, bollsNumber: 5 },
  { id: "josh", name: "سفر يشوع", shortName: "يشوع", altNames: ["يشوع","يش"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 24, bollsNumber: 6 },
  { id: "judg", name: "سفر القضاة", shortName: "القضاة", altNames: ["القضاة","قض"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 21, bollsNumber: 7 },
  { id: "ruth", name: "سفر راعوث", shortName: "راعوث", altNames: ["راعوث","رع"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 4, bollsNumber: 8 },
  { id: "1sam", name: "سفر صموئيل الأول", shortName: "صموئيل الأول", altNames: ["صموئيل الأول","1صم"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 31, bollsNumber: 9 },
  { id: "2sam", name: "سفر صموئيل الثاني", shortName: "صموئيل الثاني", altNames: ["صموئيل الثاني","2صم"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 24, bollsNumber: 10 },
  { id: "1kings", name: "سفر ملوك الأول", shortName: "ملوك الأول", altNames: ["ملوك الأول","1مل"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 22, bollsNumber: 11 },
  { id: "2kings", name: "سفر ملوك الثاني", shortName: "ملوك الثاني", altNames: ["ملوك الثاني","2مل"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 25, bollsNumber: 12 },
  { id: "1chron", name: "سفر أخبار الأيام الأول", shortName: "أخبار الأيام الأول", altNames: ["أخبار الأيام الأول","1أخ"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 29, bollsNumber: 13 },
  { id: "2chron", name: "سفر أخبار الأيام الثاني", shortName: "أخبار الأيام الثاني", altNames: ["أخبار الأيام الثاني","2أخ"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 36, bollsNumber: 14 },
  { id: "ezra", name: "سفر عزرا", shortName: "عزرا", altNames: ["عزرا","عز"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 10, bollsNumber: 15 },
  { id: "neh", name: "سفر نحميا", shortName: "نحميا", altNames: ["نحميا","نح"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 13, bollsNumber: 16 },
  { id: "esth", name: "سفر أستير", shortName: "أستير", altNames: ["أستير","فر"], testament: "OT", category: "الأسفار التاريخية", totalChapters: 10, bollsNumber: 17 },
  { id: "job", name: "سفر أيوب", shortName: "أيوب", altNames: ["أيوب","اي"], testament: "OT", category: "الأسفار الشعرية والحكمية", totalChapters: 42, bollsNumber: 18 },
  { id: "psalm", name: "سفر المزامير", shortName: "المزامير", altNames: ["المزامير","مزمور","مز"], testament: "OT", category: "الأسفار الشعرية والحكمية", totalChapters: 150, bollsNumber: 19 },
  { id: "prov", name: "سفر الأمثال", shortName: "الأمثال", altNames: ["الأمثال","أم"], testament: "OT", category: "الأسفار الشعرية والحكمية", totalChapters: 31, bollsNumber: 20 },
  { id: "eccl", name: "سفر الجامعة", shortName: "الجامعة", altNames: ["الجامعة","جا"], testament: "OT", category: "الأسفار الشعرية والحكمية", totalChapters: 12, bollsNumber: 21 },
  { id: "song", name: "سفر نشيد الأنشاد", shortName: "نشيد الأنشاد", altNames: ["نشيد الأنشاد","نش"], testament: "OT", category: "الأسفار الشعرية والحكمية", totalChapters: 8, bollsNumber: 22 },
  { id: "isa", name: "سفر إشعياء", shortName: "إشعياء", altNames: ["إشعياء","اش"], testament: "OT", category: "الأنبياء الكبار", totalChapters: 66, bollsNumber: 23 },
  { id: "jer", name: "سفر إرميا", shortName: "إرميا", altNames: ["إرميا","إر"], testament: "OT", category: "الأنبياء الكبار", totalChapters: 52, bollsNumber: 24 },
  { id: "lam", name: "سفر مراثي إرميا", shortName: "مراثي إرميا", altNames: ["مراثي إرميا","مر"], testament: "OT", category: "الأنبياء الكبار", totalChapters: 5, bollsNumber: 25 },
  { id: "ezek", name: "سفر حزقيال", shortName: "حزقيال", altNames: ["حزقيال","حز"], testament: "OT", category: "الأنبياء الكبار", totalChapters: 48, bollsNumber: 26 },
  { id: "dan", name: "سفر دانيال", shortName: "دانيال", altNames: ["دانيال","دا"], testament: "OT", category: "الأنبياء الكبار", totalChapters: 12, bollsNumber: 27 },
  { id: "hos", name: "سفر هوشع", shortName: "هوشع", altNames: ["هوشع","هو"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 14, bollsNumber: 28 },
  { id: "joel", name: "سفر يوئيل", shortName: "يوئيل", altNames: ["يوئيل","يو"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 3, bollsNumber: 29 },
  { id: "amos", name: "سفر عاموس", shortName: "عاموس", altNames: ["عاموس","عا"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 9, bollsNumber: 30 },
  { id: "obad", name: "سفر عوبديا", shortName: "عوبديا", altNames: ["عوبديا","عو"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 1, bollsNumber: 31 },
  { id: "jonah", name: "سفر يونان", shortName: "يونان", altNames: ["يونان","يون"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 4, bollsNumber: 32 },
  { id: "mic", name: "سفر ميخاء", shortName: "ميخاء", altNames: ["ميخاء","مي"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 7, bollsNumber: 33 },
  { id: "nah", name: "سفر ناحوم", shortName: "ناحوم", altNames: ["ناحوم","نا"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 3, bollsNumber: 34 },
  { id: "hab", name: "سفر حبقوق", shortName: "حبقوق", altNames: ["حبقوق","حب"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 3, bollsNumber: 35 },
  { id: "zeph", name: "سفر صفنيا", shortName: "صفنيا", altNames: ["صفنيا","صف"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 3, bollsNumber: 36 },
  { id: "hag", name: "سفر حجي", shortName: "حجي", altNames: ["حجي","حج"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 2, bollsNumber: 37 },
  { id: "zech", name: "سفر زكريا", shortName: "زكريا", altNames: ["زكريا","زك"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 14, bollsNumber: 38 },
  { id: "mal", name: "سفر ملاخي", shortName: "ملاخي", altNames: ["ملاخي","مل"], testament: "OT", category: "الأنبياء الصغار", totalChapters: 4, bollsNumber: 39 },
  { id: "matt", name: "إنجيل متى", shortName: "متى", altNames: ["متى","مت"], testament: "NT", category: "الأناجيل المقدسة", totalChapters: 28, bollsNumber: 40 },
  { id: "mark", name: "إنجيل مرقس", shortName: "مرقس", altNames: ["مرقس","مر"], testament: "NT", category: "الأناجيل المقدسة", totalChapters: 16, bollsNumber: 41 },
  { id: "luke", name: "إنجيل لوقا", shortName: "لوقا", altNames: ["لوقا","لو"], testament: "NT", category: "الأناجيل المقدسة", totalChapters: 24, bollsNumber: 42 },
  { id: "john", name: "إنجيل يوحنا", shortName: "يوحنا", altNames: ["يوحنا","يو"], testament: "NT", category: "الأناجيل المقدسة", totalChapters: 21, bollsNumber: 43 },
  { id: "acts", name: "سفر أعمال الرسل", shortName: "أعمال الرسل", altNames: ["أعمال الرسل","اع"], testament: "NT", category: "الأسفار التاريخية (العهد الجديد)", totalChapters: 28, bollsNumber: 44 },
  { id: "rom", name: "رسالة بولس الرسول إلى أهل رومية", shortName: "رومية", altNames: ["رومية","رو"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 16, bollsNumber: 45 },
  { id: "1cor", name: "رسالة بولس الرسول الأولى إلى أهل كورنثوس", shortName: "كورنثوس الأولى", altNames: ["كورنثوس الأولى","1كو"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 16, bollsNumber: 46 },
  { id: "2cor", name: "رسالة بولس الرسول الثانية إلى أهل كورنثوس", shortName: "كورنثوس الثانية", altNames: ["كورنثوس الثانية","2كو"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 13, bollsNumber: 47 },
  { id: "gal", name: "رسالة بولس الرسول إلى أهل غلاطية", shortName: "غلاطية", altNames: ["غلاطية","غل"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 6, bollsNumber: 48 },
  { id: "eph", name: "رسالة بولس الرسول إلى أهل أفسس", shortName: "أفسس", altNames: ["أفسس","اف"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 6, bollsNumber: 49 },
  { id: "phil", name: "رسالة بولس الرسول إلى أهل فيلبي", shortName: "فيلبي", altNames: ["فيلبي","في"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 4, bollsNumber: 50 },
  { id: "col", name: "رسالة بولس الرسول إلى أهل كولوسي", shortName: "كولوسي", altNames: ["كولوسي","كو"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 4, bollsNumber: 51 },
  { id: "1thess", name: "رسالة بولس الرسول الأولى إلى أهل تسالونيكي", shortName: "تسالونيكي الأولى", altNames: ["تسالونيكي الأولى","1تس"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 5, bollsNumber: 52 },
  { id: "2thess", name: "رسالة بولس الرسول الثانية إلى أهل تسالونيكي", shortName: "تسالونيكي الثانية", altNames: ["تسالونيكي الثانية","2تس"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 3, bollsNumber: 53 },
  { id: "1tim", name: "رسالة بولس الرسول الأولى إلى تيموثاوس", shortName: "تيموثاوس الأولى", altNames: ["تيموثاوس الأولى","1تي"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 6, bollsNumber: 54 },
  { id: "2tim", name: "رسالة بولس الرسول الثانية إلى تيموثاوس", shortName: "تيموثاوس الثانية", altNames: ["تيموثاوس الثانية","2تي"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 4, bollsNumber: 55 },
  { id: "titus", name: "رسالة بولس الرسول إلى طيطس", shortName: "طيطس", altNames: ["طيطس","طت"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 3, bollsNumber: 56 },
  { id: "philm", name: "رسالة بولس الرسول إلى فيلمون", shortName: "فيلمون", altNames: ["فيلمون","فل"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 1, bollsNumber: 57 },
  { id: "heb", name: "رسالة بولس الرسول إلى العبرانيين", shortName: "العبرانيين", altNames: ["العبرانيين","عب"], testament: "NT", category: "رسائل بولس الرسول", totalChapters: 13, bollsNumber: 58 },
  { id: "jas", name: "رسالة يعقوب الرسول", shortName: "يعقوب", altNames: ["يعقوب","يع"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 5, bollsNumber: 59 },
  { id: "1pet", name: "رسالة بطرس الرسول الأولى", shortName: "بطرس الأولى", altNames: ["بطرس الأولى","1بط"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 5, bollsNumber: 60 },
  { id: "2pet", name: "رسالة بطرس الرسول الثانية", shortName: "بطرس الثانية", altNames: ["بطرس الثانية","2بط"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 3, bollsNumber: 61 },
  { id: "1john", name: "رسالة يوحنا الرسول الأولى", shortName: "يوحنا الأولى", altNames: ["يوحنا الأولى","1يو"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 5, bollsNumber: 62 },
  { id: "2john", name: "رسالة يوحنا الرسول الثانية", shortName: "يوحنا الثانية", altNames: ["يوحنا الثانية","2يو"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 1, bollsNumber: 63 },
  { id: "3john", name: "رسالة يوحنا الرسول الثالثة", shortName: "يوحنا الثالثة", altNames: ["يوحنا الثالثة","3يو"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 1, bollsNumber: 64 },
  { id: "jude", name: "رسالة يهوذا الرسول", shortName: "يهوذا", altNames: ["يهوذا","يه"], testament: "NT", category: "رسائل الكاثوليكون", totalChapters: 1, bollsNumber: 65 },
  { id: "rev", name: "سفر رؤيا يوحنا اللاهوتي", shortName: "الرؤيا", altNames: ["الرؤيا","رؤ"], testament: "NT", category: "الأسفار النبوية (العهد الجديد)", totalChapters: 22, bollsNumber: 66 },];

export const TESTAMENT_LABELS: Record<BibleTestament, string> = {
  OT: 'العهد القديم',
  NT: 'العهد الجديد',
};

const normalize = (value: string) =>
  value
    .trim()
    .replace(/[ً-ْٰ]/g, '') // tashkeel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();

export function findBibleBook(idOrName: string): BibleBook | undefined {
  const needle = normalize(idOrName);
  if (!needle) return undefined;
  return BIBLE_BOOKS.find((book) =>
    book.id === idOrName ||
    normalize(book.name) === needle ||
    book.altNames.some((alt) => normalize(alt) === needle),
  );
}

export function searchBibleBooks(query: string, testament: BibleTestament | 'ALL' = 'ALL'): BibleBook[] {
  const needle = normalize(query);
  return BIBLE_BOOKS.filter((book) => {
    if (testament !== 'ALL' && book.testament !== testament) return false;
    if (!needle) return true;
    return normalize(book.name).includes(needle) || book.altNames.some((alt) => normalize(alt).includes(needle));
  });
}
