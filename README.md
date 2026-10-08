## Database and admin dashboard

The website reads its content from Neon PostgreSQL when DATABASE_URL is set.
/admin is a private dashboard for one administrator. It edits the existing
content sections and manages blog drafts, published articles, and images.
There is no registration flow or external CMS account.

1. Put the Neon connection string in .env.local as DATABASE_URL.
2. Run npm run admin:setup to create the admin login and a random temporary
   password. Login details are saved privately in outputs/admin-access.txt,
   which is excluded from Git. Passwords are stored as scrypt hashes.
   To choose credentials, pass ADMIN_SETUP_USERNAME and ADMIN_SETUP_PASSWORD
   as environment variables to this command. Re-running it revokes old sessions.
3. Run npm run dev and open http://localhost:3000/admin.

Blog editing uses the free, MIT-licensed
[React Markdown Editor](https://github.com/uiwjs/react-md-editor), using its
smaller build that excludes syntax highlighting. It needs no subscription,
service account, or API key. Markdown previews are sanitized; public articles
render safely through React Markdown without raw HTML.

Images can be uploaded in the dashboard (JPEG, PNG, WebP, GIF; up to 3 MB each).
They are stored in PostgreSQL and served from stable /media/... URLs.
Before storing a file, the upload API optimizes it with Sharp: at most 1600px
on the longest side, keeping proportions, WebP quality 82, and no enlargement.
Transparency and GIF/WebP animation are preserved. Already small images stay
in their original format if conversion would increase their size. Invalid
images or inputs exceeding 40 million total pixels are rejected.
Only new file uploads are optimized; external image URLs are not copied into
the database, and previously stored images keep their existing URLs and bytes.
Image frames display the full image with its proportions preserved, centered
against a white background wherever the frame and image proportions differ.
Blog main images can use a file upload or an HTTP/HTTPS image URL. The image
and its description are saved with the post and displayed on its list entry
and article page. The Markdown editor also supports images within the article.
After saving a draft, select it in the post list and use **Preview saved post** to open the full article layout,
including its writer name and main image. Preview pages require an admin
session and show the last saved version; drafts stay hidden from the public blog.
Draft posts remain hidden from public pages until published. The administrator
enters the writer name for each article.
Only an authenticated administrator can create or edit a blog post.
Duplicate blog URLs automatically receive a numbered suffix, such as `post-2`.
Saving shows a success alert and clears the form for a new post. Saved posts
remain in the post list for editing and previewing; adjusted URLs appear in the alert.
Home shows the latest three published articles beside the hero in a vertical sidebar with
dates, titles, and one-line summaries with ellipses. **More** links to /blog; drafts stay hidden.
The dashboard prevents overwriting edits saved from another browser window.
Drag content items in the dashboard list to reorder them, then save. Arrow
buttons also support keyboard and touch use. Order numbers update automatically;
the public website keeps its existing section, category, and year groups.
New items appear at the top of the list. New News items default to today's date
in the administrator's browser timezone.
The Professor tab edits the single profile without add/remove controls.
Students **Group** and Publications **Category** use dropdowns. Use **Manage
groups** or **Manage categories** to add or delete names in a popup, then save
the section to persist both the list and its items. Existing content supplies
the initial choices. Names in use cannot be removed until their items are
assigned to another choice; unused names are kept even when no item uses them.
Drag the handles or use the arrow buttons in the popup to reorder groups and
categories, then save. The dropdowns and public section headings use that order;
member/item order and publication year order still apply within each section.
New Students items start with the Aarhus University default portrait URL.
Saving a blank Photo URL also restores that default; custom photos are retained.

Sessions last eight hours and use signed HttpOnly cookies. Login attempts are
limited in the database. All admin write endpoints check login and request
origin. Database credentials and password hashes remain on the server.
Admin pages and APIs send defensive browser headers, including a policy that
prevents the dashboard from being embedded in an iframe.

For Vercel, configure DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD_HASH,
and ADMIN_SESSION_SECRET in the project environment variables and redeploy.
Use the values generated in .env.local.

## Content tabs

| Tab | Fields |
| --- | --- |
| Settings | key, value |
| News | month, content, link_label, link_url, visible, display_order |
| Professor | name, secondary_name, photo_url, title, affiliation, email, personal_url, cv_url, scholar_url, bio, visible |
| ProfessorDetails | section, display_order, content, subtext, link_label, link_url, visible |
| ProfessorPublications | category, order, content, visible |
| Students | group, display_order, name, secondary_name, photo_url, status, affiliation, email, personal_url, cv_url, scholar_url, research_topics, visible |
| Alumni | display_order, name, secondary_name, photo_url, degree, period, current_position, personal_url, visible |
| Research | display_order, title, summary, details, image_url, image_alt, link_label, link_url, visible |
| Publications | category, year, display_order, venue, title, authors, paper_url, project_url, code_url, video_url, visible |

Home displays the first three visible `Research` rows, sorted by `display_order`.
Each card shows `image_url`, `title`, and the first sentence of `summary`, and the entire card links to
Research. Edit them together under **Research / Home cards** in the dashboard;
saved changes update both pages.
In `Settings`, `hero_image_url` controls the image to the right of the Home
introduction and `hero_image_alt` supplies its accessible description. Leave
`hero_image_url` blank to hide it. The Home title, tagline, affiliation, and
introduction also come from `Settings`.
News uses `display_order` when provided; otherwise it displays newest dates first.

Wrap words in `**double asterisks**` to display them in bold, for example
`Our paper was accepted at **NeurIPS 2026**.` This works in displayed text,
including news, profiles, research, publication authors, and link labels.
Keep each bold phrase on one line. Put each paragraph on a new line; HTML and
other Markdown formatting are not rendered. Inline hyperlinks are additionally supported in
all `ProfessorDetails` sections (`section`, `content`, and `subtext`) and in
the professor's Publication List. Use `[link text](https://example.com)`;
bold formatting can be combined with links.

Students groups and publication categories follow the order configured in
the dashboard's **Manage groups** and **Manage categories** dialogs.
`display_order` sorts members within each group. Publications within a category
are sorted by year and then by `display_order`.

Use `ProfessorPublications` for the professor's Publication List. Put one complete
citation in each `content` field, using `**author name**` for bold and
`[DOI](https://doi.org/...)` for a hyperlink. Categories follow the order in which
they first appear in visible, populated rows. `order` sorts citations within
each category; blank order values appear last, keeping their list order.
Clear **Visible** to hide a citation.

The page shows category headings smaller than Publication List, with no internal
divider lines. Numbering continues across categories. Numbers align with the
Publication List heading's left edge; wrapped citation text keeps its indent.
HTTP, HTTPS, and mailto links are supported; unsafe URLs are displayed as plain
text. Keep each formatted phrase on one line.

The professor page reads publication entries only from this tab; other profile
sections remain in `ProfessorDetails`. Existing Publication List, Publications,
or Selected Publications section names preserve the list's position on the
professor page. With no such section, the list appears last.

## Deploy to Vercel

1. Push this project to a Git repository and import it from the Vercel dashboard.
2. Keep the automatically detected **Next.js** framework preset and default
   build settings.
3. Add the Neon DATABASE_URL and generated ADMIN_USERNAME, ADMIN_PASSWORD_HASH,
   and ADMIN_SESSION_SECRET under **Project Settings → Environment Variables**
   for the target environment.
4. Deploy. After changing an environment variable, redeploy the project.

The website reads database content on each request, so dashboard edits appear
on page refresh without rebuilding.

## Search engine discovery

`/robots.txt` allows crawling and points to `/sitemap.xml`. The sitemap includes
the seven public pages and all published blog posts, with each post's last
updated date. Drafts, admin pages, and API endpoints are excluded from the sitemap.
Both files use the request's site address and update without rebuilding.
Admin pages retain their `noindex` metadata.

After deploying, submit `sitemap.xml` in Google Search Console's Sitemaps report.

## Checks

~~~bash
npm run build
node --test tests/*.test.mjs
npm run lint
~~~

After building, npm run test:db runs an opt-in integration test against the
database in .env.local. It verifies admin access, a temporary content edit,
image upload, author names, and draft/published blog visibility, then restores
the original content and removes the temporary post and image.

Vercel deployment and custom-domain assignment are performed from the Vercel
dashboard and are not run automatically by this repository.
