import { analyzeScreenshot } from "@/app/openaiService";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

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

interface Task {
	name: string;
	description: string;
	category: string;
	source_img: string;
}

export async function GET(request: Request) {
	// Create supabase client
	const supabase = await createClient();

	const user = { id: "1" };

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
	const tasks = await generateTasksFromScreenshots(supabase, screenshotUrls);

	return new Response(JSON.stringify({ tasks }), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

async function generateTasksFromScreenshots(
	supabase: SupabaseClient,
	urls: string[]
): Promise<Task[]> {
	if (!urls || urls.length === 0) {
		return [];
	}

	// fetch data from supabase table: "outputs" check if the image url already exists in the table,
	// return the data if it exists
	const tasksPromises = urls.map(async (url) => {
		const { data, error } = await supabase
			.from("outputs") // Assuming 'outputs' is the table name
			.select("name, description, source_img, category") // Select all columns
			.eq("source_img", url) // Assuming 'image_url' is the column with the screenshot URL
			.maybeSingle(); // Fetches a single row or null

		if (error) {
			console.error(
				`Error fetching data from 'outputs' table for URL ${url}:`,
				error
			);
			return null; // Handle error or skip this URL
		}

		if (data) {
			return data;
		}

		const analysisResult = await analyzeScreenshot(url);

		if (!analysisResult) {
			return null;
		}

		// insert new task into the table
		const { data: insertionData, error: insertionError } = await supabase
			.from("outputs")
			.insert({
				name: analysisResult.task,
				description: analysisResult.reason,
				category: analysisResult.category,
				source_img: url,
			});

		if (insertionError) {
			console.error(
				`Error inserting new task into 'outputs' table:`,
				insertionError
			);
			return null;
		} else {
			return insertionData;
		}
	});

	const results = await Promise.all(tasksPromises);
	return results.filter((task) => task !== null); // Filter out nulls (URLs not found or errored)
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
