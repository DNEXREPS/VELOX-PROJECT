"use client";
/**
 * Lightweight i18n: English + Bahasa Indonesia dictionaries for the site chrome, authentication,
 * account area, image states, guest prompts and Bike Finder controls. Long-form catalogue content
 * (manufacturer specs) stays in the manufacturer's language.
 *
 * Language = the saved preference, or on "auto" the browser language (Indonesian browsers → "id").
 * Server render and first client render always use English so hydration matches; the preferred
 * language applies immediately after hydration.
 */
import { useEffect } from "react";
import { settingsStore } from "./state";
import { useHydrated, useStore } from "./store";

export type Lang = "en" | "id";
export type LangPref = Lang | "auto";

const en = {
  "nav.finder": "Bike Finder", "nav.build": "Build a Bike", "nav.upgrade": "Upgrade Advisor", "nav.brands": "Brands", "nav.components": "Components",
  "nav.compare": "Compare", "nav.garage": "My Garage", "nav.tools": "Tools", "nav.search": "Search", "nav.signIn": "Sign in", "nav.account": "Account",
  "nav.menu": "Menu", "nav.skip": "Skip to content", "nav.glossary": "Cycling glossary",
  "img.officialPhoto": "Official photo", "img.missing": "Verified product photo not available", "img.failed": "Photo failed to load",
  "img.missingExplain": "VELOX only shows photos that are confirmed to depict this model and that come from the manufacturer or a licensed source.",
  "img.seeManufacturer": "See the manufacturer’s photos", "img.noOfficialPage": "No official product page is on record yet.",
  "img.adminUnverified": "Admin image · not yet verified", "img.gallery": "Product photos", "img.photo": "Photo",
  "auth.welcome": "Welcome to VELOX", "auth.welcomeSub": "Sign in to save your bikes, builds and upgrade plans across devices. Browsing stays open to everyone.",
  "auth.createTitle": "Create your VELOX account", "auth.createSub": "Free. Save your garage, builds, favourites and AI Mechanic history.",
  "auth.google": "Continue with Google", "auth.or": "or", "auth.email": "Email address", "auth.password": "Password", "auth.passwordConfirm": "Confirm password",
  "auth.fullName": "Full name", "auth.signIn": "Sign in", "auth.signUp": "Create account", "auth.signOut": "Sign out", "auth.forgot": "Forgot password?",
  "auth.remember": "Keep me signed in on this device", "auth.noAccount": "New to VELOX?", "auth.haveAccount": "Already have an account?",
  "auth.terms": "I agree to the Terms of Use and Privacy Policy", "auth.termsLink": "Terms", "auth.privacyLink": "Privacy",
  "auth.resetTitle": "Reset your password", "auth.resetSub": "Enter your email. If an account exists, we’ll send a link to choose a new password.",
  "auth.sendReset": "Send reset link", "auth.resetSent": "If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.",
  "auth.newPasswordTitle": "Choose a new password", "auth.newPassword": "New password", "auth.savePassword": "Save new password",
  "auth.passwordSaved": "Password updated. You’re signed in.", "auth.checkEmail": "Check your email",
  "auth.checkEmailBody": "We sent a confirmation link to {email}. Open it to activate your account, then sign in.",
  "auth.invalid": "Email or password is incorrect.", "auth.notConfirmed": "Please confirm your email address first — check your inbox.",
  "auth.rateLimited": "Too many attempts. Please wait a minute and try again.", "auth.genericError": "Something went wrong. Please try again.",
  "auth.unavailable": "Accounts are not available on this server yet", "auth.unavailableBody": "The site owner has not connected an authentication provider. You can keep browsing and saving on this device.",
  "auth.googleUnavailable": "Google sign-in has not been enabled by the site owner.", "auth.callbackError": "We couldn’t complete sign-in. The link may have expired — please try again.",
  "auth.pwRules": "At least 8 characters, with a letter and a number.", "auth.pwMismatch": "Passwords do not match.", "auth.emailInvalid": "Enter a valid email address.",
  "auth.nameRequired": "Enter your name.", "auth.termsRequired": "Please accept the terms to continue.", "auth.working": "Please wait…",
  "auth.verified": "Email confirmed — welcome to VELOX.", "auth.signedOut": "Signed out", "auth.signedIn": "Signed in",
  "prompt.title": "Save it to your account", "prompt.body": "Create a free VELOX account to keep this {thing} and use it on any device.",
  "prompt.signIn": "Sign in", "prompt.signUp": "Create free account", "prompt.local": "Save on this device only", "prompt.close": "Not now",
  "thing.garage": "bike in My Garage", "thing.build": "build", "thing.wishlist": "favourite", "thing.plan": "upgrade plan", "thing.history": "diagnosis",
  "account.title": "Account settings", "account.profile": "Profile", "account.name": "Display name", "account.emailLabel": "Email", "account.save": "Save changes",
  "account.saved": "Saved", "account.connected": "Sign-in methods", "account.googleConnected": "Google connected", "account.emailPassword": "Email & password",
  "account.password": "Password", "account.changePassword": "Change password", "account.prefs": "Preferences", "account.currency": "Currency",
  "account.units": "Measurements", "account.metric": "Metric (kg, mm)", "account.imperial": "Imperial (lb, in)", "account.language": "Language",
  "account.auto": "Automatic (browser)", "account.notifications": "Notifications", "account.notifyPrice": "Price changes on saved bikes",
  "account.notifyNews": "VELOX product news", "account.notifyNote": "Preferences are saved now; email delivery starts once notifications are enabled on the server.",
  "account.data": "Your data", "account.syncStatus": "Synced to your account", "account.delete": "Delete account",
  "account.deleteBody": "Permanently deletes your account, profile, garage, builds, favourites, upgrade plans and AI Mechanic history. This cannot be undone.",
  "account.deleteConfirm": "Type DELETE to confirm", "account.deleted": "Your account and data were deleted.", "account.signedOutTitle": "You’re browsing as a guest",
  "account.local": "Saved on this device", "account.history": "AI Mechanic history", "account.plans": "Upgrade plans",
  "finder.sortMatch": "Best match", "finder.sortPriceAsc": "Price: low to high", "finder.sortPriceDesc": "Price: high to low", "finder.sortNewest": "Newest models",
  "finder.sortName": "Name A–Z", "finder.clear": "Clear all filters", "finder.beginner": "New to cycling?", "finder.beginnerBody": "Pick a budget and how you’ll ride — VELOX explains every match. Unsure what a term means? Hover or tap the dotted words, or open the glossary.",
  "finder.minPrice": "Minimum price", "common.notAvailable": "Not Available", "common.estimated": "Estimated", "common.verified": "Verified",
  "lang.en": "English", "lang.id": "Bahasa Indonesia",
} as const;

export type TKey = keyof typeof en;

const id: Record<TKey, string> = {
  "nav.finder": "Cari Sepeda", "nav.build": "Rakit Sepeda", "nav.upgrade": "Saran Upgrade", "nav.brands": "Merek", "nav.components": "Komponen",
  "nav.compare": "Bandingkan", "nav.garage": "Garasi Saya", "nav.tools": "Alat", "nav.search": "Cari", "nav.signIn": "Masuk", "nav.account": "Akun",
  "nav.menu": "Menu", "nav.skip": "Langsung ke konten", "nav.glossary": "Kamus istilah sepeda",
  "img.officialPhoto": "Foto resmi", "img.missing": "Foto produk terverifikasi belum tersedia", "img.failed": "Foto gagal dimuat",
  "img.missingExplain": "VELOX hanya menampilkan foto yang dipastikan menggambarkan model ini dan berasal dari produsen atau sumber berlisensi.",
  "img.seeManufacturer": "Lihat foto dari produsen", "img.noOfficialPage": "Halaman produk resmi belum tercatat.",
  "img.adminUnverified": "Gambar admin · belum diverifikasi", "img.gallery": "Foto produk", "img.photo": "Foto",
  "auth.welcome": "Selamat datang di VELOX", "auth.welcomeSub": "Masuk untuk menyimpan sepeda, rakitan, dan rencana upgrade di semua perangkat. Menjelajah tetap terbuka untuk semua.",
  "auth.createTitle": "Buat akun VELOX", "auth.createSub": "Gratis. Simpan garasi, rakitan, favorit, dan riwayat AI Mechanic.",
  "auth.google": "Lanjutkan dengan Google", "auth.or": "atau", "auth.email": "Alamat email", "auth.password": "Kata sandi", "auth.passwordConfirm": "Ulangi kata sandi",
  "auth.fullName": "Nama lengkap", "auth.signIn": "Masuk", "auth.signUp": "Buat akun", "auth.signOut": "Keluar", "auth.forgot": "Lupa kata sandi?",
  "auth.remember": "Tetap masuk di perangkat ini", "auth.noAccount": "Baru di VELOX?", "auth.haveAccount": "Sudah punya akun?",
  "auth.terms": "Saya menyetujui Ketentuan Penggunaan dan Kebijakan Privasi", "auth.termsLink": "Ketentuan", "auth.privacyLink": "Privasi",
  "auth.resetTitle": "Atur ulang kata sandi", "auth.resetSub": "Masukkan email Anda. Jika akunnya ada, kami kirimkan tautan untuk membuat kata sandi baru.",
  "auth.sendReset": "Kirim tautan", "auth.resetSent": "Jika akun untuk alamat itu ada, tautan atur ulang sedang dikirim. Periksa kotak masuk dan folder spam.",
  "auth.newPasswordTitle": "Buat kata sandi baru", "auth.newPassword": "Kata sandi baru", "auth.savePassword": "Simpan kata sandi",
  "auth.passwordSaved": "Kata sandi diperbarui. Anda sudah masuk.", "auth.checkEmail": "Periksa email Anda",
  "auth.checkEmailBody": "Kami mengirim tautan konfirmasi ke {email}. Buka tautan itu untuk mengaktifkan akun, lalu masuk.",
  "auth.invalid": "Email atau kata sandi salah.", "auth.notConfirmed": "Konfirmasi alamat email Anda dulu — periksa kotak masuk.",
  "auth.rateLimited": "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.", "auth.genericError": "Terjadi kesalahan. Silakan coba lagi.",
  "auth.unavailable": "Akun belum tersedia di server ini", "auth.unavailableBody": "Pemilik situs belum menghubungkan penyedia autentikasi. Anda tetap bisa menjelajah dan menyimpan di perangkat ini.",
  "auth.googleUnavailable": "Masuk dengan Google belum diaktifkan oleh pemilik situs.", "auth.callbackError": "Proses masuk tidak dapat diselesaikan. Tautan mungkin kedaluwarsa — silakan coba lagi.",
  "auth.pwRules": "Minimal 8 karakter, mengandung huruf dan angka.", "auth.pwMismatch": "Kata sandi tidak sama.", "auth.emailInvalid": "Masukkan alamat email yang valid.",
  "auth.nameRequired": "Masukkan nama Anda.", "auth.termsRequired": "Setujui ketentuan untuk melanjutkan.", "auth.working": "Mohon tunggu…",
  "auth.verified": "Email terkonfirmasi — selamat datang di VELOX.", "auth.signedOut": "Anda telah keluar", "auth.signedIn": "Berhasil masuk",
  "prompt.title": "Simpan ke akun Anda", "prompt.body": "Buat akun VELOX gratis untuk menyimpan {thing} ini dan membukanya di perangkat mana pun.",
  "prompt.signIn": "Masuk", "prompt.signUp": "Buat akun gratis", "prompt.local": "Simpan di perangkat ini saja", "prompt.close": "Nanti saja",
  "thing.garage": "sepeda di Garasi Saya", "thing.build": "rakitan", "thing.wishlist": "favorit", "thing.plan": "rencana upgrade", "thing.history": "diagnosis",
  "account.title": "Pengaturan akun", "account.profile": "Profil", "account.name": "Nama tampilan", "account.emailLabel": "Email", "account.save": "Simpan perubahan",
  "account.saved": "Tersimpan", "account.connected": "Metode masuk", "account.googleConnected": "Google terhubung", "account.emailPassword": "Email & kata sandi",
  "account.password": "Kata sandi", "account.changePassword": "Ganti kata sandi", "account.prefs": "Preferensi", "account.currency": "Mata uang",
  "account.units": "Satuan", "account.metric": "Metrik (kg, mm)", "account.imperial": "Imperial (lb, in)", "account.language": "Bahasa",
  "account.auto": "Otomatis (browser)", "account.notifications": "Notifikasi", "account.notifyPrice": "Perubahan harga sepeda tersimpan",
  "account.notifyNews": "Kabar produk VELOX", "account.notifyNote": "Preferensi sudah tersimpan; pengiriman email dimulai setelah notifikasi diaktifkan di server.",
  "account.data": "Data Anda", "account.syncStatus": "Tersinkron ke akun Anda", "account.delete": "Hapus akun",
  "account.deleteBody": "Menghapus permanen akun, profil, garasi, rakitan, favorit, rencana upgrade, dan riwayat AI Mechanic. Tidak dapat dibatalkan.",
  "account.deleteConfirm": "Ketik DELETE untuk mengonfirmasi", "account.deleted": "Akun dan data Anda telah dihapus.", "account.signedOutTitle": "Anda menjelajah sebagai tamu",
  "account.local": "Tersimpan di perangkat ini", "account.history": "Riwayat AI Mechanic", "account.plans": "Rencana upgrade",
  "finder.sortMatch": "Paling cocok", "finder.sortPriceAsc": "Harga: termurah", "finder.sortPriceDesc": "Harga: termahal", "finder.sortNewest": "Model terbaru",
  "finder.sortName": "Nama A–Z", "finder.clear": "Hapus semua filter", "finder.beginner": "Baru bersepeda?", "finder.beginnerBody": "Pilih anggaran dan cara Anda bersepeda — VELOX menjelaskan setiap kecocokan. Tidak paham istilahnya? Arahkan atau ketuk kata bergaris titik, atau buka kamus istilah.",
  "finder.minPrice": "Harga minimum", "common.notAvailable": "Tidak Tersedia", "common.estimated": "Perkiraan", "common.verified": "Terverifikasi",
  "lang.en": "English", "lang.id": "Bahasa Indonesia",
};

export const DICTS: Record<Lang, Record<TKey, string>> = { en, id };

export function detectLang(pref: LangPref | undefined, navLang?: string): Lang {
  if (pref === "en" || pref === "id") return pref;
  return (navLang ?? "").toLowerCase().startsWith("id") ? "id" : "en";
}

export function translate(lang: Lang, key: TKey, vars?: Record<string, string>): string {
  let s = DICTS[lang][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

export function useLang(): Lang {
  const hydrated = useHydrated();
  const { language } = useStore(settingsStore);
  return hydrated ? detectLang(language, typeof navigator !== "undefined" ? navigator.language : undefined) : "en";
}

export function useT() {
  const lang = useLang();
  return (key: TKey, vars?: Record<string, string>) => translate(lang, key, vars);
}

/** Keeps <html lang> in sync with the active language (screen readers, hyphenation). */
export function HtmlLang() {
  const lang = useLang();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return null;
}
