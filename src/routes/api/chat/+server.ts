import { XAI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    try {
        if (!XAI_API_KEY) {
            console.error('XAI_API_KEY is not set');
            return json({ error: 'API key not configured' }, { status: 500 });
        }

        const { message } = await request.json();
        if (!message) {
            return json({ error: 'Message is required' }, { status: 400 });
        }

        console.log('Sending request to X...', {
            message,
            apiKey: XAI_API_KEY.substring(0, 10) + '...' // Log first 10 chars of API key for debugging
        });

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'grok-3',
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                errorData = responseText;
            }
            
            console.error('X API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`X API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = JSON.parse(responseText);
        console.log('Parsed response:', data);
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from X API');
        }

        return json({ response: data.choices[0].message.content });
    } catch (error) {
        console.error('Error getting AI response:', error);
        return json({ 
            error: 'Failed to get AI response',
            details: error.message
        }, { status: 500 });
    }
} 