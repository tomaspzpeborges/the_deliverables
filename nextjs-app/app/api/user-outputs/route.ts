import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { analyzeScreenshot, AnalysisResult } from "@/app/openaiService";

interface UserScreenshot {
	publicUrl: string;
	name: string;
	bucket_id: string;
	owner: string;
	id: string;
	updated_at: string;
	created_at: string;
	last_accessed_at: string;
	metadata: Record<string, any>;
	buckets: any;
}

interface GetUserScreenshotsResult {
	files?: UserScreenshot[];
	error?: string;
	details?: string;
}

export async function GET(request: Request) {
	// Create supabase client
	const supabase = await createClient();

	// Get user
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return new Response(JSON.stringify({ error: "User not found" }), {
			headers: { "Content-Type": "application/json" },
			status: 401,
		});
	}

	// Fetch user's screenshot URLs
	const screenshots = await getUserScreenshots(supabase, user.id);

	if (screenshots.error) {
		return new Response(JSON.stringify({ error: screenshots.error }), {
			headers: { "Content-Type": "application/json" },
			status: 500,
		});
	}
	if (!screenshots.files) {
		return new Response(JSON.stringify({ error: "No screenshots found" }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}

	const screenshotUrls = screenshots.files.map((file) => file.publicUrl);

	// Call function to generate tasks
	const tasks = await generateTasksFromScreenshots(screenshotUrls);

	return new Response(JSON.stringify({ tasks }), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

async function generateTasksFromScreenshots(urls: string[]) {
	// Process all screenshots in parallel and collect the results
	const results = await Promise.all(
		urls.map(async (url) => {
			return analyzeScreenshot(url);
		})
	);
	console.log("results", results);
	// Flatten results if analyzeScreenshot returns arrays
	const allTasks = results.flat();
	
	return allTasks;
}

async function getUserScreenshots(
	supabase: SupabaseClient,
	userId: string
): Promise<GetUserScreenshotsResult> {
	const bucketName = "screenshots";
	const { data: files, error: listError } = await supabase.storage
		.from(bucketName)
		.list(userId);

	if (listError) {
		return {
			error: "Failed to list screenshots",
			details: listError.message,
		};
	}

	const filesWithUrls = files?.map((file) => {
		const {
			data: { publicUrl },
		} = supabase.storage
			.from(bucketName)
			.getPublicUrl(`${userId}/${file.name}`);
		return {
			...file,
			publicUrl,
		};
	});

	return { files: filesWithUrls as UserScreenshot[] };
}
