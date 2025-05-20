<script lang="ts">
	let message = $state('');
	let responses = $state<string[]>([]);
	let isLoading = $state(false);

	async function handleSubmit() {
		if (!message.trim() || isLoading) return;
		
		const userMessage = message;
		message = '';
		isLoading = true;
		
		// Add user message to responses
		responses = [...responses, `You: ${userMessage}`];
		
		try {
			// Get AI response from our API endpoint
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ message: userMessage })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to get AI response');
			}

			responses = [...responses, `AI: ${data.response}`];
		} catch (error: any) {
			console.error('Error:', error);
			responses = [...responses, `AI: Error: ${error.message || 'Unknown error'}`];
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="max-w-2xl mx-auto">
		<div class="bg-white rounded-lg shadow-lg overflow-hidden">
			<!-- Chat messages -->
			<div class="h-[calc(100vh-200px)] overflow-y-auto p-4 space-y-4">
				{#each responses as response}
					<div class="p-3 rounded-lg {response.startsWith('You:') ? 'bg-blue-100 ml-4' : response.startsWith('AI: Error:') ? 'bg-red-100 mr-4' : 'bg-gray-100 mr-4'}">
						{response}
					</div>
				{/each}
				{#if isLoading}
					<div class="p-3 rounded-lg bg-gray-100 mr-4">
						AI is thinking...
					</div>
				{/if}
			</div>
			
			<!-- Input form -->
			<form on:submit|preventDefault={handleSubmit} class="p-4 border-t">
				<div class="flex flex-col gap-2">
					<div class="relative">
						<textarea
							bind:value={message}
							placeholder="Type your message..."
							class="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
							disabled={isLoading}
							maxlength={32767}
						/>
						<div class="absolute bottom-2 right-2 text-sm text-gray-500">
							{message.length}/32767
						</div>
					</div>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed self-end"
						disabled={isLoading || !message.trim()}
					>
						{isLoading ? 'Sending...' : 'Send'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div> 