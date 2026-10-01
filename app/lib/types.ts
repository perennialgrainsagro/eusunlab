export type SheetRow = Record<string, unknown>;

export type DataResult<T> = {
  data: T;
  demo: boolean;
};

export type Settings = {
  lab_name: string;
  tagline: string;
  introduction: string;
  hero_image_url: string;
  affiliation: string;
  contact_email: string;
  address: string;
  footer_text: string;
  research_heading: string;
  research_intro: string;
  publications_intro: string;
};

export type NewsItem = {
  month: string;
  content: string;
  link_label: string;
  link_url: string;
};

export type Professor = {
  name: string;
  secondary_name: string;
  photo_url: string;
  title: string;
  affiliation: string;
  email: string;
  personal_url: string;
  cv_url: string;
  scholar_url: string;
  bio: string;
};

export type ProfessorDetail = {
  section: string;
  display_order: number;
  content: string;
  subtext: string;
  link_label: string;
  link_url: string;
};

export type Student = {
  group: string;
  display_order: number;
  name: string;
  secondary_name: string;
  photo_url: string;
  status: string;
  affiliation: string;
  email: string;
  personal_url: string;
  cv_url: string;
  scholar_url: string;
  research_topics: string;
};

export type Alumni = {
  display_order: number;
  name: string;
  secondary_name: string;
  photo_url: string;
  degree: string;
  period: string;
  current_position: string;
  personal_url: string;
};

export type ResearchItem = {
  display_order: number;
  title: string;
  summary: string;
  details: string;
  image_url: string;
  image_alt: string;
  link_label: string;
  link_url: string;
};

export type Publication = {
  category: string;
  year: number;
  display_order: number;
  venue: string;
  title: string;
  authors: string;
  paper_url: string;
  project_url: string;
  code_url: string;
  video_url: string;
};
