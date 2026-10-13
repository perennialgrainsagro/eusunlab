import { notFound } from "next/navigation";
import { loadProjects, loadSettings } from "../../lib/content.ts";
import { plainText } from "../../lib/format-text.ts";
import { SiteFrame } from "../../site-components";
import { ProjectArticle } from "../article";

type Context = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Context) {
  const { slug } = await params;
  const { data } = await loadProjects();
  const item = data.find((item) => item.slug === slug);
  return { title: plainText(item?.title || "Projects"), description: item ? plainText(item.summary) : undefined };
}

export default async function ProjectPage({ params }: Context) {
  const { slug } = await params;
  const [settings, projects] = await Promise.all([loadSettings(), loadProjects()]);
  const item = projects.data.find((item) => item.slug === slug);
  if (!item) notFound();
  return (
    <SiteFrame settings={settings.data} demo={settings.demo || projects.demo} active="projects">
      <ProjectArticle item={item} />
    </SiteFrame>
  );
}
