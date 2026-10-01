

## Connect Google Sheets

1. Upload outputs/eusun-han-lab/Eusun-Han-Lab-content-template.xlsx to Google
   Drive and open it as a Google Sheet.
2. In Google Sheets, choose **File → Share → Publish to web** and publish the
   entire document. Keep edit access restricted to the lab team.
3. Copy the ID between /d/ and /edit in the Sheet URL.
4. Put it in .env.local:

   ~~~dotenv
   GOOGLE_SHEET_ID=your_sheet_id_here
   ~~~

5. Restart npm run dev. Further Sheet edits appear after refreshing a page.

The tab names and header names must stay unchanged. Rows with visible=FALSE
are hidden; blank or TRUE rows are shown. Use a real date in the News month
column and format it as mmm yyyy. Images must use publicly accessible http://
or https:// URLs.

## Content tabs

| Tab | Row-one headers |
| --- | --- |
| Settings | key, value |
| News | month, content, link_label, link_url, visible |
| Professor | name, secondary_name, photo_url, title, affiliation, email, personal_url, cv_url, scholar_url, bio, visible |
| ProfessorDetails | section, display_order, content, subtext, link_label, link_url, visible |
| ProfessorPublications | category, order, content, visible |
| Students | group, display_order, name, secondary_name, photo_url, status, affiliation, email, personal_url, cv_url, scholar_url, research_topics, visible |
| Alumni | display_order, name, secondary_name, photo_url, degree, period, current_position, personal_url, visible |
| Research | display_order, title, summary, details, image_url, image_alt, link_label, link_url, visible |
| Publications | category, year, display_order, venue, title, authors, paper_url, project_url, code_url, video_url, visible |

Wrap words in `**double asterisks**` to display them in bold, for example
`Our paper was accepted at **NeurIPS 2026**.` This works in displayed text,
including news, profiles, research, publication authors, and link labels.
Keep each bold phrase on one line. Put each paragraph on a new line; HTML and
other Markdown formatting are not rendered. Excel font styling is not
transferred to the website. Inline hyperlinks are additionally supported in
all `ProfessorDetails` sections (`section`, `content`, and `subtext`) and in
the professor's Publication List. Use `[link text](https://example.com)`;
bold formatting can be combined with links.

The Students group column accepts any text. Group sections appear in the order
their names first occur in the sheet; display_order sorts members within each
group.

Publication category sections also appear in the order their names first occur
in the sheet. Publications within a category are sorted by year and then by
display_order.

Use `ProfessorPublications` for the professor's Publication List. Put one complete
citation in each `content` cell, using `**author name**` for bold and
`[DOI](https://doi.org/...)` for a hyperlink. Categories follow the order in which
they first appear in visible, populated rows. `order` sorts citations within
each category; blank order cells appear last, keeping their sheet order. Existing
`display_order` headers also work. `visible=FALSE` hides a citation.

The page shows category headings smaller than Publication List, with no internal
divider lines. Numbering continues across categories. Numbers align with the
Publication List heading's left edge; wrapped citation text keeps its indent.
Existing sheets can also use their `title` column for the full citation; other
publication fields are not used for this list.
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
3. Add `GOOGLE_SHEET_ID` under **Project Settings → Environment Variables** for
   Production and Preview.
4. Deploy. After changing an environment variable, redeploy the project.

The Google Sheet must be published to the web. The server reads it with
`cache: no-store`, so published content updates appear on page refresh without
rebuilding the site.

## Checks

~~~bash
npm run build
node --test tests/*.test.mjs
~~~

Vercel deployment and custom-domain assignment are performed from the Vercel
dashboard and are not run automatically by this repository.
