export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, token, databaseId, title, content } = req.body ?? {};
    if (!token) return res.status(400).json({ error: 'token is required' });

    const notionHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
    };

    // Test connection: just fetch the database info
    if (action === 'test') {
        if (!databaseId) return res.status(400).json({ error: 'databaseId is required' });
        const r = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: notionHeaders
        });
        const data = await r.json();
        return res.status(r.status).json(data);
    }

    // Send page to Notion
    if (!databaseId || !content) {
        return res.status(400).json({ error: 'databaseId and content are required' });
    }

    // Split content into paragraph blocks (max 2000 chars each per Notion limit)
    const lines = content.split('\n');
    const children = [];
    for (const line of lines) {
        if (!line.trim()) {
            children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
            continue;
        }
        // Chunk long lines
        let remaining = line;
        while (remaining.length > 0) {
            const chunk = remaining.slice(0, 2000);
            remaining = remaining.slice(2000);
            children.push({
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] }
            });
        }
    }

    const r = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: {
                title: { title: [{ type: 'text', text: { content: title || '無題' } }] }
            },
            children: children.slice(0, 100) // Notion API limit: 100 blocks per request
        })
    });

    const data = await r.json();
    return res.status(r.status).json(data);
}
