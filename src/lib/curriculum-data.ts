export interface Course {
  code: string;
  name: string;
  credits: number;
  type: "theory" | "practical";
}

export interface TermCurriculum {
  termKey: string;
  level: number;
  term: number;
  title: string;
  totalCredits: number;
  courses: Course[];
}

export interface DepartmentCurriculum {
  id: string;
  name: string;
  shortName: string;
  totalCredits: number;
  terms: TermCurriculum[];
}

export const BUTEX_GRADING_SCALE = [
  { letter: "A+", point: 4.00, minMarks: 80, maxMarks: 100, label: "80% and above" },
  { letter: "A",  point: 3.75, minMarks: 75, maxMarks: 79,  label: "75% to 79%" },
  { letter: "A-", point: 3.50, minMarks: 70, maxMarks: 74,  label: "70% to 74%" },
  { letter: "B+", point: 3.25, minMarks: 65, maxMarks: 69,  label: "65% to 69%" },
  { letter: "B",  point: 3.00, minMarks: 60, maxMarks: 64,  label: "60% to 64%" },
  { letter: "B-", point: 2.75, minMarks: 55, maxMarks: 59,  label: "55% to 59%" },
  { letter: "C+", point: 2.50, minMarks: 50, maxMarks: 54,  label: "50% to 54%" },
  { letter: "C",  point: 2.25, minMarks: 45, maxMarks: 49,  label: "45% to 49%" },
  { letter: "D",  point: 2.00, minMarks: 40, maxMarks: 44,  label: "40% to 44%" },
  { letter: "F",  point: 0.00, minMarks: 0,  maxMarks: 39,  label: "Less than 40%" },
] as const;

export function marksToGradePoint(marks: number): number {
  if (marks >= 80) return 4.00;
  if (marks >= 75) return 3.75;
  if (marks >= 70) return 3.50;
  if (marks >= 65) return 3.25;
  if (marks >= 60) return 3.00;
  if (marks >= 55) return 2.75;
  if (marks >= 50) return 2.50;
  if (marks >= 45) return 2.25;
  if (marks >= 40) return 2.00;
  return 0.00;
}

export function gradePointToLetter(point: number): string {
  if (point >= 4.00) return "A+";
  if (point >= 3.75) return "A";
  if (point >= 3.50) return "A-";
  if (point >= 3.25) return "B+";
  if (point >= 3.00) return "B";
  if (point >= 2.75) return "B-";
  if (point >= 2.50) return "C+";
  if (point >= 2.25) return "C";
  if (point >= 2.00) return "D";
  return "F";
}

export function letterToGradePoint(letter: string): number {
  const match = BUTEX_GRADING_SCALE.find((g) => g.letter === letter);
  return match ? match.point : 0.00;
}

export const ALL_CURRICULA: Record<string, DepartmentCurriculum> = {
  ae: {
    id: "ae",
    name: "Apparel Engineering",
    shortName: "AE",
    totalCredits: 164,
    terms: [
      {
        termKey: "1-1", level: 1, term: 1, title: "Level 1 Term 1", totalCredits: 19,
        courses: [
          { code: "MS 101", name: "Mathematics-I", credits: 3.0, type: "theory" },
          { code: "PHY 101", name: "Physics-I", credits: 3.0, type: "theory" },
          { code: "PHY 102", name: "Physics-I (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 101", name: "Chemistry-I", credits: 3.0, type: "theory" },
          { code: "CHEM 102", name: "Chemistry-I (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 101", name: "Polymer Science & Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 102", name: "Machine Shop Practice (Practical)", credits: 1.0, type: "practical" },
          { code: "MDM 101", name: "Computer Programming", credits: 3.0, type: "theory" },
          { code: "MDM 102", name: "Computer Programming (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "1-2", level: 1, term: 2, title: "Level 1 Term 2", totalCredits: 22,
        courses: [
          { code: "MS 103", name: "Mathematics-II", credits: 3.0, type: "theory" },
          { code: "PHY 103", name: "Physics-II", credits: 3.0, type: "theory" },
          { code: "PHY 104", name: "Physics-II (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 103", name: "Chemistry-II", credits: 3.0, type: "theory" },
          { code: "CHEM 104", name: "Chemistry-II (Practical)", credits: 1.0, type: "practical" },
          { code: "HSS 101", name: "Business and Communicative English", credits: 3.0, type: "theory" },
          { code: "HSS 102", name: "Business and Communicative English (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 101", name: "Natural Textile Fibres", credits: 3.0, type: "theory" },
          { code: "AE 101", name: "Introduction to Apparel Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 104", name: "Engineering Drawing (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-1", level: 2, term: 1, title: "Level 2 Term 1", totalCredits: 19,
        courses: [
          { code: "AE 201", name: "Apparel Production-I", credits: 3.0, type: "theory" },
          { code: "AE 202", name: "Apparel Production-I (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 204", name: "Pattern Making-I (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 209", name: "Textile Physics", credits: 3.0, type: "theory" },
          { code: "TEM 201", name: "Fundamentals of Marketing", credits: 3.0, type: "theory" },
          { code: "MDM 201", name: "Fundamentals of EEE", credits: 3.0, type: "theory" },
          { code: "MDM 202", name: "Fundamentals of EEE (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 205", name: "Wet Processing-I", credits: 3.0, type: "theory" },
          { code: "WPE 206", name: "Wet Processing-I (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-2", level: 2, term: 2, title: "Level 2 Term 2", totalCredits: 22,
        courses: [
          { code: "MS 201", name: "Statistics", credits: 3.0, type: "theory" },
          { code: "YE 213", name: "Yarn Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "YE 214", name: "Yarn Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 201", name: "Fabric Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "FE 202", name: "Fabric Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 203", name: "Man-made Textile Fibres", credits: 3.0, type: "theory" },
          { code: "YE 211", name: "Textile Testing and Quality Control", credits: 3.0, type: "theory" },
          { code: "YE 212", name: "Textile Testing and Quality Control (Practical)", credits: 1.0, type: "practical" },
          { code: "IPE 203", name: "Fundamentals of Mechanical Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 204", name: "Fundamentals of Mechanical Engineering (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "3-1", level: 3, term: 1, title: "Level 3 Term 1", totalCredits: 18,
        courses: [
          { code: "AE 301", name: "Apparel Production-II", credits: 3.0, type: "theory" },
          { code: "AE 302", name: "Apparel Production-II (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 304", name: "Pattern Making-II (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 305", name: "Fabric Structure & Design", credits: 3.0, type: "theory" },
          { code: "FE 306", name: "Fabric Structure & Design (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 309", name: "Quality Management", credits: 3.0, type: "theory" },
          { code: "TEM 303", name: "Accounting and Cost Management", credits: 3.0, type: "theory" },
          { code: "IPE 301", name: "Automation & Control Engineering", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "3-2", level: 3, term: 2, title: "Level 3 Term 2", totalCredits: 23,
        courses: [
          { code: "AE 305", name: "Apparel Washing, Dyeing & Printing", credits: 3.0, type: "theory" },
          { code: "AE 306", name: "Apparel Washing, Dyeing & Printing (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 308", name: "Pattern Making-III (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 307", name: "Yarn Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "YE 308", name: "Yarn Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 303", name: "Fabric Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "FE 304", name: "Fabric Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 311", name: "Wet Processing-II", credits: 3.0, type: "theory" },
          { code: "WPE 312", name: "Wet Processing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 313", name: "Industrial Management", credits: 3.0, type: "theory" },
          { code: "HSS 301", name: "Economics", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-1", level: 4, term: 1, title: "Level 4 Term 1", totalCredits: 20,
        courses: [
          { code: "AE 401", name: "Apparel Merchandising", credits: 3.0, type: "theory" },
          { code: "AE 403", name: "Commercial Issues in Apparel Business", credits: 3.0, type: "theory" },
          { code: "AE 404", name: "Pattern Making-IV (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 405", name: "Apparel Production, Planning & Control", credits: 3.0, type: "theory" },
          { code: "AE 407", name: "Application of Computer in Apparel Mfg", credits: 3.0, type: "theory" },
          { code: "AE 408", name: "Application of Computer in Apparel Mfg (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 409", name: "Clothing Comfort", credits: 3.0, type: "theory" },
          { code: "WPE 407", name: "Environmental Studies", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-2", level: 4, term: 2, title: "Level 4 Term 2", totalCredits: 21,
        courses: [
          { code: "AE 411", name: "Special Apparel Production", credits: 3.0, type: "theory" },
          { code: "AE 413", name: "Industrial Engineering in Apparel Production", credits: 3.0, type: "theory" },
          { code: "AE 415", name: "Compliance in Apparel Industry", credits: 3.0, type: "theory" },
          { code: "HSS 401", name: "Sociology", credits: 3.0, type: "theory" },
          { code: "AE 416", name: "AE Industrial Attachment (2 months)", credits: 3.0, type: "practical" },
          { code: "AE 418", name: "AE Project Work", credits: 3.0, type: "practical" },
          { code: "AE 420", name: "AE Comprehensive Viva", credits: 3.0, type: "practical" },
        ]
      }
    ]
  },
  wpe: {
    id: "wpe",
    name: "Wet Process Engineering",
    shortName: "WPE",
    totalCredits: 166,
    terms: [
      {
        termKey: "1-1", level: 1, term: 1, title: "Level 1 Term 1", totalCredits: 19,
        courses: [
          { code: "MS 101", name: "Mathematics-I", credits: 3.0, type: "theory" },
          { code: "PHY 101", name: "Physics-I", credits: 3.0, type: "theory" },
          { code: "PHY 102", name: "Physics-I (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 101", name: "Chemistry-I", credits: 3.0, type: "theory" },
          { code: "CHEM 102", name: "Chemistry-I (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 101", name: "Polymer Science & Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 102", name: "Machine Shop Practice (Practical)", credits: 1.0, type: "practical" },
          { code: "MDM 101", name: "Computer Programming", credits: 3.0, type: "theory" },
          { code: "MDM 102", name: "Computer Programming (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "1-2", level: 1, term: 2, title: "Level 1 Term 2", totalCredits: 19,
        courses: [
          { code: "MS 103", name: "Mathematics-II", credits: 3.0, type: "theory" },
          { code: "PHY 103", name: "Physics-II", credits: 3.0, type: "theory" },
          { code: "PHY 104", name: "Physics-II (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 103", name: "Chemistry-II", credits: 3.0, type: "theory" },
          { code: "CHEM 104", name: "Chemistry-II (Practical)", credits: 1.0, type: "practical" },
          { code: "HSS 101", name: "Business and Communicative English", credits: 3.0, type: "theory" },
          { code: "HSS 102", name: "Business and Communicative English (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 101", name: "Natural Textile Fibres", credits: 3.0, type: "theory" },
          { code: "IPE 104", name: "Engineering Drawing (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-1", level: 2, term: 1, title: "Level 2 Term 1", totalCredits: 21,
        courses: [
          { code: "WPE 201", name: "Wet Preparatory Process", credits: 3.0, type: "theory" },
          { code: "WPE 202", name: "Wet Preparatory Process (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 203", name: "Chemistry of Textile Chemicals & Auxiliaries", credits: 3.0, type: "theory" },
          { code: "AE 205", name: "Apparel Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "AE 206", name: "Apparel Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 209", name: "Textile Physics", credits: 3.0, type: "theory" },
          { code: "TEM 201", name: "Fundamentals of Marketing", credits: 3.0, type: "theory" },
          { code: "MDM 201", name: "Fundamentals of EEE", credits: 3.0, type: "theory" },
          { code: "MDM 202", name: "Fundamentals of EEE (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-2", level: 2, term: 2, title: "Level 2 Term 2", totalCredits: 22,
        courses: [
          { code: "YE 213", name: "Yarn Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "YE 214", name: "Yarn Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 201", name: "Fabric Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "FE 202", name: "Fabric Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 211", name: "Textile Testing and Quality Control", credits: 3.0, type: "theory" },
          { code: "YE 212", name: "Textile Testing and Quality Control (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 203", name: "Man-made Textile Fibres", credits: 3.0, type: "theory" },
          { code: "IPE 203", name: "Fundamentals of Mechanical Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 204", name: "Fundamentals of Mechanical Engineering (Practical)", credits: 1.0, type: "practical" },
          { code: "MS 201", name: "Statistics", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "3-1", level: 3, term: 1, title: "Level 3 Term 1", totalCredits: 24,
        courses: [
          { code: "WPE 301", name: "Textile Coloration-I", credits: 3.0, type: "theory" },
          { code: "WPE 302", name: "Textile Coloration-I (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 303", name: "Application of Computer in Wet Processing", credits: 3.0, type: "theory" },
          { code: "WPE 304", name: "Application of Computer in Wet Processing (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 305", name: "Chemistry of Dyes & Pigments", credits: 3.0, type: "theory" },
          { code: "WPE 307", name: "Theory of Color Physics", credits: 3.0, type: "theory" },
          { code: "FE 305", name: "Fabric Structure & Design", credits: 3.0, type: "theory" },
          { code: "FE 306", name: "Fabric Structure & Design (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 303", name: "Accounting and Cost Management", credits: 3.0, type: "theory" },
          { code: "IPE 301", name: "Automation & Control Engineering", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "3-2", level: 3, term: 2, title: "Level 3 Term 2", totalCredits: 22,
        courses: [
          { code: "WPE 309", name: "Wet Processing Machinery", credits: 3.0, type: "theory" },
          { code: "WPE 310", name: "Wet Processing Machinery (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 307", name: "Yarn Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "YE 308", name: "Yarn Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 303", name: "Fabric Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "FE 304", name: "Fabric Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 309", name: "Apparel Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "AE 310", name: "Apparel Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "HSS 301", name: "Economics", credits: 3.0, type: "theory" },
          { code: "TEM 313", name: "Industrial Management", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-1", level: 4, term: 1, title: "Level 4 Term 1", totalCredits: 20,
        courses: [
          { code: "WPE 401", name: "Textile Coloration-II", credits: 3.0, type: "theory" },
          { code: "WPE 402", name: "Textile Coloration-II (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 403", name: "Textile Finishing", credits: 3.0, type: "theory" },
          { code: "WPE 404", name: "Textile Finishing (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 405", name: "Technical & Functional Textiles", credits: 3.0, type: "theory" },
          { code: "WPE 407", name: "Environmental Studies", credits: 3.0, type: "theory" },
          { code: "TEM 409", name: "Textile & Apparel Merchandizing", credits: 3.0, type: "theory" },
          { code: "TEM 413", name: "Production Planning & Control", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-2", level: 4, term: 2, title: "Level 4 Term 2", totalCredits: 19,
        courses: [
          { code: "WPE 409", name: "Special Wet Processing", credits: 3.0, type: "theory" },
          { code: "WPE 411", name: "Testing and Quality Control of Finished Textiles", credits: 3.0, type: "theory" },
          { code: "WPE 412", name: "Testing and Quality Control of Finished Textiles (Practical)", credits: 1.0, type: "practical" },
          { code: "HSS 401", name: "Sociology", credits: 3.0, type: "theory" },
          { code: "WPE 414", name: "WPE Industrial Attachment (2 months)", credits: 3.0, type: "practical" },
          { code: "WPE 416", name: "WPE Project Work", credits: 3.0, type: "practical" },
          { code: "WPE 418", name: "WPE Comprehensive Viva", credits: 3.0, type: "practical" },
        ]
      }
    ]
  },
  fe: {
    id: "fe",
    name: "Fabric Engineering",
    shortName: "FE",
    totalCredits: 166,
    terms: [
      {
        termKey: "1-1", level: 1, term: 1, title: "Level 1 Term 1", totalCredits: 19,
        courses: [
          { code: "MS 101", name: "Mathematics-I", credits: 3.0, type: "theory" },
          { code: "PHY 101", name: "Physics-I", credits: 3.0, type: "theory" },
          { code: "PHY 102", name: "Physics-I (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 101", name: "Chemistry-I", credits: 3.0, type: "theory" },
          { code: "CHEM 102", name: "Chemistry-I (Practical)", credits: 1.0, type: "practical" },
          { code: "HSS 101", name: "Business and Communicative English", credits: 3.0, type: "theory" },
          { code: "HSS 102", name: "Business and Communicative English (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 101", name: "Natural Textile Fibres", credits: 3.0, type: "theory" },
          { code: "IPE 104", name: "Engineering Drawing (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "1-2", level: 1, term: 2, title: "Level 1 Term 2", totalCredits: 22,
        courses: [
          { code: "MS 103", name: "Mathematics-II", credits: 3.0, type: "theory" },
          { code: "PHY 103", name: "Physics-II", credits: 3.0, type: "theory" },
          { code: "PHY 104", name: "Physics-II (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 103", name: "Chemistry-II", credits: 3.0, type: "theory" },
          { code: "CHEM 104", name: "Chemistry-II (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 101", name: "Polymer Science & Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 101", name: "Engineering Materials", credits: 3.0, type: "theory" },
          { code: "IPE 102", name: "Machine Shop Practice (Practical)", credits: 1.0, type: "practical" },
          { code: "MDM 101", name: "Computer Programming", credits: 3.0, type: "theory" },
          { code: "MDM 102", name: "Computer Programming (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-1", level: 2, term: 1, title: "Level 2 Term 1", totalCredits: 22,
        courses: [
          { code: "MS 201", name: "Statistics", credits: 3.0, type: "theory" },
          { code: "YE 201", name: "Fibre and Yarn Testing", credits: 3.0, type: "theory" },
          { code: "YE 202", name: "Fibre and Yarn Testing (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 203", name: "Man-made Textile Fibres", credits: 3.0, type: "theory" },
          { code: "YE 213", name: "Yarn Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "YE 214", name: "Yarn Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 203", name: "Weaving Preparatory Process", credits: 3.0, type: "theory" },
          { code: "FE 204", name: "Weaving Preparatory Process (Practical)", credits: 1.0, type: "practical" },
          { code: "IPE 203", name: "Fundamentals of Mechanical Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 204", name: "Fundamentals of Mechanical Engineering (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-2", level: 2, term: 2, title: "Level 2 Term 2", totalCredits: 22,
        courses: [
          { code: "YE 209", name: "Textile Physics", credits: 3.0, type: "theory" },
          { code: "FE 205", name: "Weaving-I", credits: 3.0, type: "theory" },
          { code: "FE 206", name: "Weaving-I (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 205", name: "Wet Processing-I", credits: 3.0, type: "theory" },
          { code: "WPE 206", name: "Wet Processing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 205", name: "Apparel Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "AE 206", name: "Apparel Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 201", name: "Fundamentals of Marketing", credits: 3.0, type: "theory" },
          { code: "MDM 201", name: "Fundamentals of EEE", credits: 3.0, type: "theory" },
          { code: "MDM 202", name: "Fundamentals of EEE (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "3-1", level: 3, term: 1, title: "Level 3 Term 1", totalCredits: 22,
        courses: [
          { code: "HSS 301", name: "Economics", credits: 3.0, type: "theory" },
          { code: "YE 307", name: "Yarn Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "YE 308", name: "Yarn Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 307", name: "Knitting-I", credits: 3.0, type: "theory" },
          { code: "FE 308", name: "Knitting-I (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 311", name: "Wet Processing-II", credits: 3.0, type: "theory" },
          { code: "WPE 312", name: "Wet Processing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 309", name: "Apparel Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "AE 310", name: "Apparel Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 313", name: "Industrial Management", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "3-2", level: 3, term: 2, title: "Level 3 Term 2", totalCredits: 18,
        courses: [
          { code: "FE 301", name: "Application of Computer in Fabric Mfg", credits: 3.0, type: "theory" },
          { code: "FE 302", name: "Application of Computer in Fabric Mfg (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 305", name: "Fabric Structure & Design", credits: 3.0, type: "theory" },
          { code: "FE 306", name: "Fabric Structure & Design (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 309", name: "Weaving-II", credits: 3.0, type: "theory" },
          { code: "FE 310", name: "Weaving-II (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 303", name: "Accounting and Cost Management", credits: 3.0, type: "theory" },
          { code: "IPE 301", name: "Automation & Control Engineering", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-1", level: 4, term: 1, title: "Level 4 Term 1", totalCredits: 19,
        courses: [
          { code: "HSS 401", name: "Sociology", credits: 3.0, type: "theory" },
          { code: "FE 401", name: "Fabric Testing & Quality Control", credits: 3.0, type: "theory" },
          { code: "FE 402", name: "Fabric Testing & Quality Control (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 404", name: "Knit Fabric Analysis (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 405", name: "Knitting-II", credits: 3.0, type: "theory" },
          { code: "FE 406", name: "Knitting-II (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 409", name: "Special Fabric Production", credits: 3.0, type: "theory" },
          { code: "FE 410", name: "Special Fabric Production (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 409", name: "Textile & Apparel Merchandizing", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-2", level: 4, term: 2, title: "Level 4 Term 2", totalCredits: 22,
        courses: [
          { code: "FE 407", name: "Nonwoven", credits: 3.0, type: "theory" },
          { code: "FE 408", name: "Nonwoven (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 411", name: "Technical Textile", credits: 3.0, type: "theory" },
          { code: "WPE 407", name: "Environmental Studies", credits: 3.0, type: "theory" },
          { code: "TEM 413", name: "Production Planning & Control", credits: 3.0, type: "theory" },
          { code: "FE 412", name: "FE Industrial Attachment (2 months)", credits: 3.0, type: "practical" },
          { code: "FE 414", name: "FE Project Work", credits: 3.0, type: "practical" },
          { code: "FE 416", name: "FE Comprehensive Viva", credits: 3.0, type: "practical" },
        ]
      }
    ]
  },
  ye: {
    id: "ye",
    name: "Yarn Engineering",
    shortName: "YE",
    totalCredits: 169,
    terms: [
      {
        termKey: "1-1", level: 1, term: 1, title: "Level 1 Term 1", totalCredits: 19,
        courses: [
          { code: "MS 101", name: "Mathematics-I", credits: 3.0, type: "theory" },
          { code: "PHY 101", name: "Physics-I", credits: 3.0, type: "theory" },
          { code: "PHY 102", name: "Physics-I (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 101", name: "Chemistry-I", credits: 3.0, type: "theory" },
          { code: "CHEM 102", name: "Chemistry-I (Practical)", credits: 1.0, type: "practical" },
          { code: "HSS 101", name: "Business and Communicative English", credits: 3.0, type: "theory" },
          { code: "HSS 102", name: "Business and Communicative English (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 101", name: "Natural Textile Fibres", credits: 3.0, type: "theory" },
          { code: "IPE 104", name: "Engineering Drawing (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "1-2", level: 1, term: 2, title: "Level 1 Term 2", totalCredits: 22,
        courses: [
          { code: "MS 103", name: "Mathematics-II", credits: 3.0, type: "theory" },
          { code: "PHY 103", name: "Physics-II", credits: 3.0, type: "theory" },
          { code: "PHY 104", name: "Physics-II (Practical)", credits: 1.0, type: "practical" },
          { code: "CHEM 103", name: "Chemistry-II", credits: 3.0, type: "theory" },
          { code: "CHEM 104", name: "Chemistry-II (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 101", name: "Polymer Science & Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 101", name: "Engineering Materials", credits: 3.0, type: "theory" },
          { code: "IPE 102", name: "Machine Shop Practice (Practical)", credits: 1.0, type: "practical" },
          { code: "MDM 101", name: "Computer Programming", credits: 3.0, type: "theory" },
          { code: "MDM 102", name: "Computer Programming (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "2-1", level: 2, term: 1, title: "Level 2 Term 1", totalCredits: 22,
        courses: [
          { code: "YE 201", name: "Fibre and Yarn Testing", credits: 3.0, type: "theory" },
          { code: "YE 202", name: "Fibre and Yarn Testing (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 203", name: "Man-made Textile Fibres", credits: 3.0, type: "theory" },
          { code: "YE 205", name: "Short Staple Spinning-I", credits: 3.0, type: "theory" },
          { code: "YE 206", name: "Short Staple Spinning-I (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 201", name: "Fabric Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "FE 202", name: "Fabric Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "IPE 203", name: "Fundamentals of Mechanical Engineering", credits: 3.0, type: "theory" },
          { code: "IPE 204", name: "Fundamentals of Mechanical Engineering (Practical)", credits: 1.0, type: "practical" },
          { code: "MS 201", name: "Statistics", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "2-2", level: 2, term: 2, title: "Level 2 Term 2", totalCredits: 22,
        courses: [
          { code: "YE 207", name: "Short Staple Spinning-II", credits: 3.0, type: "theory" },
          { code: "YE 208", name: "Short Staple Spinning-II (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 209", name: "Textile Physics", credits: 3.0, type: "theory" },
          { code: "WPE 205", name: "Wet Processing-I", credits: 3.0, type: "theory" },
          { code: "WPE 206", name: "Wet Processing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 205", name: "Apparel Manufacturing-I", credits: 3.0, type: "theory" },
          { code: "AE 206", name: "Apparel Manufacturing-I (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 201", name: "Fundamentals of Marketing", credits: 3.0, type: "theory" },
          { code: "MDM 201", name: "Fundamentals of EEE", credits: 3.0, type: "theory" },
          { code: "MDM 202", name: "Fundamentals of EEE (Practical)", credits: 1.0, type: "practical" },
        ]
      },
      {
        termKey: "3-1", level: 3, term: 1, title: "Level 3 Term 1", totalCredits: 22,
        courses: [
          { code: "HSS 301", name: "Economics", credits: 3.0, type: "theory" },
          { code: "YE 303", name: "Long Staple Spinning", credits: 3.0, type: "theory" },
          { code: "YE 304", name: "Long Staple Spinning (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 303", name: "Fabric Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "FE 304", name: "Fabric Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "AE 309", name: "Apparel Manufacturing-II", credits: 3.0, type: "theory" },
          { code: "AE 310", name: "Apparel Manufacturing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "WPE 311", name: "Wet Processing-II", credits: 3.0, type: "theory" },
          { code: "WPE 312", name: "Wet Processing-II (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 313", name: "Industrial Management", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "3-2", level: 3, term: 2, title: "Level 3 Term 2", totalCredits: 21,
        courses: [
          { code: "YE 301", name: "Application of Computer in Yarn Mfg", credits: 3.0, type: "theory" },
          { code: "YE 302", name: "Application of Computer in Yarn Mfg (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 305", name: "Process Control in Spinning", credits: 3.0, type: "theory" },
          { code: "YE 306", name: "Process Control in Spinning (Practical)", credits: 1.0, type: "practical" },
          { code: "FE 305", name: "Fabric Structure & Design", credits: 3.0, type: "theory" },
          { code: "FE 306", name: "Fabric Structure & Design (Practical)", credits: 1.0, type: "practical" },
          { code: "MDM 301", name: "Utility Machinery", credits: 3.0, type: "theory" },
          { code: "TEM 303", name: "Accounting and Cost Management", credits: 3.0, type: "theory" },
          { code: "IPE 301", name: "Automation & Control Engineering", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-1", level: 4, term: 1, title: "Level 4 Term 1", totalCredits: 20,
        courses: [
          { code: "HSS 301", name: "Economics", credits: 3.0, type: "theory" },
          { code: "YE 401", name: "Modern Yarn Manufacturing", credits: 3.0, type: "theory" },
          { code: "YE 402", name: "Modern Yarn Manufacturing (Practical)", credits: 1.0, type: "practical" },
          { code: "YE 403", name: "Special Yarn Manufacturing", credits: 3.0, type: "theory" },
          { code: "FE 401", name: "Fabric Testing & Quality Control", credits: 3.0, type: "theory" },
          { code: "FE 402", name: "Fabric Testing & Quality Control (Practical)", credits: 1.0, type: "practical" },
          { code: "TEM 409", name: "Textile & Apparel Merchandizing", credits: 3.0, type: "theory" },
          { code: "HSS 401", name: "Sociology", credits: 3.0, type: "theory" },
        ]
      },
      {
        termKey: "4-2", level: 4, term: 2, title: "Level 4 Term 2", totalCredits: 21,
        courses: [
          { code: "FE 411", name: "Technical Textile", credits: 3.0, type: "theory" },
          { code: "WPE 407", name: "Environmental Studies", credits: 3.0, type: "theory" },
          { code: "TEM 413", name: "Production Planning & Control", credits: 3.0, type: "theory" },
          { code: "TEM 403", name: "Entrepreneurship & Project Development", credits: 3.0, type: "theory" },
          { code: "YE 404", name: "YE Industrial Attachment (2 months)", credits: 3.0, type: "practical" },
          { code: "YE 406", name: "YE Project Work", credits: 3.0, type: "practical" },
          { code: "YE 408", name: "YE Comprehensive Viva", credits: 3.0, type: "practical" },
        ]
      }
    ]
  }
};