import type {
  Alumni,
  NewsItem,
  Professor,
  ProfessorDetail,
  Publication,
  ResearchItem,
  ProjectItem,
  Settings,
  Student,
} from "./types.ts";

export const sampleSettings: Settings = {
  lab_name: "Eusun Han's Lab",
  tagline: "Curious minds, careful research, meaningful impact.",
  introduction:
    "Eusun Han's Lab is a collaborative research group exploring intelligent systems and the ways they can better understand and support people. Replace this sample introduction in the Settings sheet.",
  hero_image_url: "",
  hero_image_alt: "",
  affiliation: "Example University · Sample content",
  contact_email: "lab@example.edu",
  address: "Research Building, Example University",
  footer_text: "Eusun Han's Lab",
  research_heading: "Research",
  research_intro:
    "Our sample research program connects human-centered questions with reliable computational methods. Replace these topics with the lab's actual research areas.",
  publications_intro:
    "Selected sample publications are listed below. Add the lab's work to the Publications sheet.",
};

export const sampleNews: NewsItem[] = [
  {
    month: "Date(2026,8,1)",
    content: "Sample news: the new lab website is ready for content.",
    link_label: "",
    link_url: "",
  },
  {
    month: "Date(2026,5,1)",
    content: "Sample news: add a new member announcement in the News sheet.",
    link_label: "",
    link_url: "",
  },
  {
    month: "Date(2026,2,1)",
    content: "Sample news: link a paper, award, or event from this row.",
    link_label: "Example link",
    link_url: "https://example.com",
  },
];

export const sampleProfessor: Professor = {
  name: "Eusun Han",
  secondary_name: "Professor profile · Sample content",
  photo_url: "",
  title: "Professor",
  affiliation: "Department Name, Example University",
  email: "eusun.han@example.edu",
  personal_url: "https://example.com",
  cv_url: "https://example.com",
  scholar_url: "https://scholar.google.com",
  bio: "This is sample profile text. Add the professor's biography, interests, and current appointments in the Professor sheet.",
};

export const sampleProfessorDetails: ProfessorDetail[] = [
  {
    section: "Education",
    display_order: 1,
    content: "Ph.D. in Your Field, Example University",
    subtext: "2014–2019 · Sample content",
    link_label: "",
    link_url: "",
  },
  {
    section: "Education",
    display_order: 2,
    content: "B.S. in Your Field, Example University",
    subtext: "2010–2014 · Sample content",
    link_label: "",
    link_url: "",
  },
  {
    section: "Reviewer",
    display_order: 1,
    content: "Example conferences and journals",
    subtext: "Sample content",
    link_label: "",
    link_url: "",
  },
  {
    section: "Awards",
    display_order: 1,
    content: "Example Research Award",
    subtext: "2025 · Sample content",
    link_label: "",
    link_url: "",
  },
  {
    section: "Talks",
    display_order: 1,
    content: "Example invited talk",
    subtext: "Sep 2026 · Sample content",
    link_label: "",
    link_url: "",
  },
];

export const sampleStudents: Student[] = [
  {
    group: "Graduate",
    display_order: 1,
    name: "Graduate Student 01",
    secondary_name: "Sample member",
    photo_url: "",
    status: "M.S. Student",
    affiliation: "Example University",
    email: "student01@example.edu",
    personal_url: "",
    cv_url: "",
    scholar_url: "",
    research_topics: "Human-Centered AI, Machine Learning",
    short_bio: "Studies **human-centered AI** to help people understand and use machine learning systems.\nBuilds interactive tools and evaluates them through user studies.",
  },
  {
    group: "Graduate",
    display_order: 2,
    name: "Graduate Student 02",
    secondary_name: "Sample member",
    photo_url: "",
    status: "Ph.D. Student",
    affiliation: "Example University",
    email: "student02@example.edu",
    personal_url: "",
    cv_url: "",
    scholar_url: "",
    research_topics: "Multimodal Learning",
    short_bio: "",
  },
  {
    group: "Undergraduate",
    display_order: 1,
    name: "Undergraduate Student 01",
    secondary_name: "Sample member",
    photo_url: "",
    status: "Undergraduate Researcher",
    affiliation: "Example University",
    email: "student03@example.edu",
    personal_url: "",
    cv_url: "",
    scholar_url: "",
    research_topics: "Data-Efficient Learning",
    short_bio: "",
  },
];

export const sampleAlumni: Alumni[] = [
  {
    display_order: 1,
    name: "Alumni Example 01",
    secondary_name: "Sample member",
    photo_url: "",
    degree: "M.S.",
    period: "2023–2025",
    current_position: "Example Company",
    personal_url: "",
  },
];

export const sampleResearch: ResearchItem[] = [
  {
    display_order: 1,
    title: "Human-Centered AI",
    summary: "Designing intelligent systems around real human needs.",
    details:
      "We study how people understand, use, and collaborate with intelligent systems.\nThis is sample content and should be replaced in the Research sheet.",
    image_url: "",
    image_alt: "Sample placeholder for human-centered AI research",
    link_label: "",
    link_url: "",
  },
  {
    display_order: 2,
    title: "Data-Efficient Learning",
    summary: "Learning useful representations from limited supervision.",
    details:
      "We explore methods that reduce the cost of data collection and annotation.\nAdd projects, methods, and applications relevant to the lab.",
    image_url: "",
    image_alt: "Sample placeholder for data-efficient learning research",
    link_label: "",
    link_url: "",
  },
  {
    display_order: 3,
    title: "Multimodal Intelligence",
    summary: "Connecting language, vision, and structured information.",
    details:
      "We investigate models that reason across different forms of information.\nReplace this sample area with the lab's actual research direction.",
    image_url: "",
    image_alt: "Sample placeholder for multimodal intelligence research",
    link_label: "",
    link_url: "",
  },
];

export const sampleProjects: ProjectItem[] = [
  {
    slug: "root-phenotyping-for-resilient-crops",
    preview_image_url: "",
    display_order: 1,
    title: "Root Phenotyping for Resilient Crops",
    summary: "Connecting root architecture with water and nutrient use through imaging and trait analysis.",
    details: "> Example project — this content and illustration demonstrate the page layout. Replace them with the lab’s actual project information.\n\n### Project overview\nThis example combines **root imaging**, trait extraction, and field observations to describe how crop root systems develop under different growing conditions.\n\n![Example workflow from root imaging to trait analysis and field evaluation](/projects/root-workflow.svg)\n\n### Research focus\n- Measure root depth, branching, and spatial distribution.\n- Relate root traits to water and nutrient availability.\n- Compare observations across growing conditions.",
    image_url: "/projects/root-phenotyping.svg",
    image_alt: "Illustration of a plant and its branching root system below the soil surface",
    video_url: "",
    video_caption: "",
    video_captions_url: "",
    link_label: "",
    link_url: "",
  },
  {
    slug: "image-based-plant-growth-monitoring",
    preview_image_url: "",
    display_order: 2,
    title: "Image-Based Plant Growth Monitoring",
    summary: "Following plant development over time with repeated imaging and accessible visual summaries.",
    details: "> Example project — the video below is a public sample clip, included to demonstrate video playback. It is not footage from the lab.\n\n### Project overview\nThis example explores how repeated images can help describe **plant growth and development**. Images, measurements, and video observations can be presented together in the project description.\n\n### Research focus\n- Record visible changes in plant structure over time.\n- Compare growth patterns across treatments.\n- Present observations alongside reproducible analysis.",
    image_url: "/projects/plant-monitoring.svg",
    image_alt: "Illustration of successive plant growth stages within an imaging frame",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    video_caption: "Example video: a flower clip from MDN’s CC0 media collection. Replace this URL with your project video.",
    video_captions_url: "",
    link_label: "",
    link_url: "",
  },
];

export const samplePublications: Publication[] = [
  {
    category: "International Conference",
    year: 2026,
    display_order: 1,
    venue: "Sample Conference 2026",
    title: "Example Paper: Replace This with a Publication Title",
    authors: "Eusun Han and Sample Collaborators",
    paper_url: "https://example.com",
    project_url: "",
    code_url: "https://example.com",
    video_url: "",
  },
  {
    category: "Journal",
    year: 2025,
    display_order: 1,
    venue: "Sample Journal",
    title: "Example Journal Article for the Google Sheet Template",
    authors: "Sample Author, Eusun Han",
    paper_url: "https://example.com",
    project_url: "",
    code_url: "",
    video_url: "",
  },
];

export const sampleProfessorPublications = [
  {
    category: "International Conference",
    display_order: 1,
    content: "**Eusun Han** and Sample Collaborators (2026). Example Professor Paper: Replace This with a Publication Title. Sample Conference. [Paper](https://example.com)",
  },
  {
    category: "Journal",
    display_order: 2,
    content: "Sample Author, **Eusun Han** (2025). Example Professor Journal Article. Sample Journal. [DOI](https://example.com/journal)",
  },
];
