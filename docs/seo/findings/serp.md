# SERP page-type evidence (collected by orchestrator)

The SXO specialist hit its turn cap before running any searches, so these four
queries were checked directly. This is real SERP data, not inference.

## "indexeddb viewer"
Ranking page types: Chrome Web Store listings, GitHub repos, official DevTools docs, MDN.
- chromewebstore.google.com/detail/indexeddb-viewer/... (direct competitor)
- chromewebstore.google.com/detail/indexeddbedit/... (direct competitor)
- github.com/takanori-yanagitani/indexeddb-viewer, github.com/cgav/IndexedDBViewer
- developer.chrome.com/docs/devtools/storage/indexeddb
- learn.microsoft.com (Edge equivalent), github.com/google/dfindexeddb

IdxBeaver does not appear. The asset that ranks for this query is a Chrome Web
Store listing, not a marketing page. Two competitors already hold those slots.

Implication: CWS listing optimisation (title, description, screenshots) matters
more than landing-page work for this query. The landing page cannot easily
out-rank store listings and first-party docs here.

## "how to view indexeddb in chrome"
Ranking page types: official docs and step-by-step tutorials.
- developer.chrome.com/docs/devtools/storage/indexeddb
- learn.microsoft.com/.../storage/indexeddb
- iq.opengenus.org tutorial, aaron-powell.com post

IdxBeaver's /blog/debugging-indexeddb-in-chrome-devtools/ is the CORRECT page
type for this SERP. No mismatch. Its weakness is depth (~700 words) against
first-party documentation, not format.

## "edit indexeddb chrome devtools"  <-- highest-opportunity query found
Ranking page types: docs and workaround tutorials, plus one competing tool.
Every result converges on the same statement: IndexedDB keys and values are NOT
editable from the Application panel; use Snippets or the Console instead.
- developer.chrome.com/docs/devtools/storage/indexeddb
- chromewebstore.google.com/detail/indexeddbedit/... (only tool competitor)
- iq.opengenus.org, medium.ionicfirebaseapp.com, mindstick.com

This SERP is entirely made of workarounds for the exact limitation IdxBeaver
removes (inline editing in a data grid). IdxBeaver has NO page targeting this
query. The /vs/chrome-devtools-application-panel/ page is adjacent but is
framed as a product comparison, not as an answer to "how do I edit a value".

## "query indexeddb"
Ranking page types: native API reference and tutorials, zero tool pages.
- developer.mozilla.org (Using IndexedDB), w3.org/TR/IndexedDB, web.dev/articles/indexeddb
- javascript.info/indexeddb, javascripttutorial.net, tutorialspoint, itnext.io

Confirms the SXO specialist's inferred mismatch with real data: IdxBeaver's
/blog/querying-indexeddb-with-mongo-style-filters/ leads with its proprietary
Mongo-style filter syntax, while the SERP rewards native-API explanation
(getAll, IDBKeyRange, cursors, store.count). Wrong entry angle for the query.

## Not checked
"indexeddb editor", "indexeddb viewer chrome extension",
"chrome devtools application panel alternative", "browser storage quota".
