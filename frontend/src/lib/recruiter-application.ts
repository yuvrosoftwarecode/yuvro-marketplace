export type ApplicationStatus = "not_submitted" | "pending_review" | "approved" | "rejected";

export interface CountryDialCode {
  name: string;
  code: string;
  iso: string;
  flag: string;
}

export const countryDialCodes: CountryDialCode[] = [
  { name: "Argentina", code: "+54", iso: "AR", flag: "🇦🇷" },
  { name: "Australia", code: "+61", iso: "AU", flag: "🇦🇺" },
  { name: "Austria", code: "+43", iso: "AT", flag: "🇦🇹" },
  { name: "Bangladesh", code: "+880", iso: "BD", flag: "🇧🇩" },
  { name: "Belgium", code: "+32", iso: "BE", flag: "🇧🇪" },
  { name: "Brazil", code: "+55", iso: "BR", flag: "🇧🇷" },
  { name: "Canada", code: "+1", iso: "CA", flag: "🇨🇦" },
  { name: "Chile", code: "+56", iso: "CL", flag: "🇨🇱" },
  { name: "China", code: "+86", iso: "CN", flag: "🇨🇳" },
  { name: "Colombia", code: "+57", iso: "CO", flag: "🇨🇴" },
  { name: "Czech Republic", code: "+420", iso: "CZ", flag: "🇨🇿" },
  { name: "Denmark", code: "+45", iso: "DK", flag: "🇩🇰" },
  { name: "Egypt", code: "+20", iso: "EG", flag: "🇪🇬" },
  { name: "Finland", code: "+358", iso: "FI", flag: "🇫🇮" },
  { name: "France", code: "+33", iso: "FR", flag: "🇫🇷" },
  { name: "Germany", code: "+49", iso: "DE", flag: "🇩🇪" },
  { name: "Greece", code: "+30", iso: "GR", flag: "🇬🇷" },
  { name: "Hong Kong", code: "+852", iso: "HK", flag: "🇭🇰" },
  { name: "Hungary", code: "+36", iso: "HU", flag: "🇭🇺" },
  { name: "India", code: "+91", iso: "IN", flag: "🇮🇳" },
  { name: "Indonesia", code: "+62", iso: "ID", flag: "🇮🇩" },
  { name: "Ireland", code: "+353", iso: "IE", flag: "🇮🇪" },
  { name: "Israel", code: "+972", iso: "IL", flag: "🇮🇱" },
  { name: "Italy", code: "+39", iso: "IT", flag: "🇮🇹" },
  { name: "Japan", code: "+81", iso: "JP", flag: "🇯🇵" },
  { name: "Kenya", code: "+254", iso: "KE", flag: "🇰🇪" },
  { name: "Malaysia", code: "+60", iso: "MY", flag: "🇲🇾" },
  { name: "Mexico", code: "+52", iso: "MX", flag: "🇲🇽" },
  { name: "Netherlands", code: "+31", iso: "NL", flag: "🇳🇱" },
  { name: "New Zealand", code: "+64", iso: "NZ", flag: "🇳🇿" },
  { name: "Nigeria", code: "+234", iso: "NG", flag: "🇳🇬" },
  { name: "Norway", code: "+47", iso: "NO", flag: "🇳🇴" },
  { name: "Pakistan", code: "+92", iso: "PK", flag: "🇵🇰" },
  { name: "Philippines", code: "+63", iso: "PH", flag: "🇵🇭" },
  { name: "Poland", code: "+48", iso: "PL", flag: "🇵🇱" },
  { name: "Portugal", code: "+351", iso: "PT", flag: "🇵🇹" },
  { name: "Qatar", code: "+974", iso: "QA", flag: "🇶🇦" },
  { name: "Romania", code: "+40", iso: "RO", flag: "🇷🇴" },
  { name: "Saudi Arabia", code: "+966", iso: "SA", flag: "🇸🇦" },
  { name: "Singapore", code: "+65", iso: "SG", flag: "🇸🇬" },
  { name: "South Africa", code: "+27", iso: "ZA", flag: "🇿🇦" },
  { name: "South Korea", code: "+82", iso: "KR", flag: "🇰🇷" },
  { name: "Spain", code: "+34", iso: "ES", flag: "🇪🇸" },
  { name: "Sri Lanka", code: "+94", iso: "LK", flag: "🇱🇰" },
  { name: "Sweden", code: "+46", iso: "SE", flag: "🇸🇪" },
  { name: "Switzerland", code: "+41", iso: "CH", flag: "🇨🇭" },
  { name: "Taiwan", code: "+886", iso: "TW", flag: "🇹🇼" },
  { name: "Thailand", code: "+66", iso: "TH", flag: "🇹🇭" },
  { name: "Turkey", code: "+90", iso: "TR", flag: "🇹🇷" },
  { name: "Ukraine", code: "+380", iso: "UA", flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "+971", iso: "AE", flag: "🇦🇪" },
  { name: "United Kingdom", code: "+44", iso: "GB", flag: "🇬🇧" },
  { name: "United States", code: "+1", iso: "US", flag: "🇺🇸" },
  { name: "Vietnam", code: "+84", iso: "VN", flag: "🇻🇳" },
];

export type ApplicationDraft = {
  phone: string;
  phoneCountryCode: string;
  phoneCountryIso: string;
  phoneNumber: string;
  years: string;
  startup: "" | "yes" | "no";
  startupDetail: string;
  countries: string[];
  roles: string[];
  tools: string;
  refs: [string, string, string];
};

const APP = "yuvro.recruiter.application.v1";
const STATUS = "yuvro.recruiter.application.status.v1";

export const emptyDraft = (): ApplicationDraft => ({
  phone: "",
  phoneCountryCode: "+1",
  phoneCountryIso: "US",
  phoneNumber: "",
  years: "",
  startup: "",
  startupDetail: "",
  countries: [],
  roles: [],
  tools: "",
  refs: ["", "", ""],
});

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}

export const getDraft = (): ApplicationDraft => {
  const d = { ...emptyDraft(), ...read<Partial<ApplicationDraft>>(APP, {}) };
  // Migrate legacy single phone string into country code and number
  if (!d.phoneNumber && d.phone) {
    const raw = d.phone.trim();
    const matched = countryDialCodes.find((c) => raw.startsWith(c.code));
    if (matched) {
      d.phoneCountryCode = matched.code;
      d.phoneCountryIso = matched.iso;
      d.phoneNumber = raw.slice(matched.code.length).trim();
    } else {
      const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
      if (match) {
        d.phoneCountryCode = match[1];
        d.phoneNumber = match[2];
      } else {
        d.phoneNumber = raw;
      }
    }
  }
  return d;
};

export const saveDraft = (d: ApplicationDraft) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(APP, JSON.stringify(d));
  }
};

export const clearDraft = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(APP);
  }
};

export const getStatus = () => read<ApplicationStatus | null>(STATUS, null);

export const setStatus = (s: ApplicationStatus) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STATUS, JSON.stringify(s));
  }
};

export const countries = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Singapore",
  "UAE",
  "France",
  "Netherlands",
  "Ireland",
  "Israel",
  "Japan",
  "Brazil",
  "Other",
];

export const roleOptions = [
  "AI / ML",
  "Founding Engineer",
  "Forward Deployed Engineer",
  "Full Stack Engineer",
  "Backend Engineer",
  "Account Executive",
  "GTM / Go-to-Market",
  "Frontend Engineer",
  "Customer Success",
  "HR",
  "Sales",
];

export const extractLinkedInHandle = (u: string): string | null => {
  if (!u || typeof u !== "string") return null;
  const trimmed = u.trim();
  const match = trimmed.match(
    /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-%]+)/i,
  );
  if (!match || !match[1]) return null;
  return match[1].toLowerCase().replace(/\/+$/, "");
};

export const isLinkedIn = (u: string): boolean => {
  return extractLinkedInHandle(u) !== null;
};
