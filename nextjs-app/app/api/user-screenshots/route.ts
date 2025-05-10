import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { UserScreenshot } from "@/lib/types/user-screenshot";

export async function GET() {
	const supabase = await createClient();

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return NextResponse.json(
			{
				error: "User not found or error fetching user",
				details: userError?.message,
			},
			{ status: 401 }
		);
	}

	const userId = user.id;
	const { data: files, error: listError } = await supabase.storage
		.from("screenshots")
		.list(userId, {
			limit: 100, // Adjust as needed
			offset: 0,
			sortBy: { column: "name", order: "asc" },
		});

	if (listError) {
		return NextResponse.json(
			{ error: "Failed to list screenshots", details: listError.message },
			{ status: 500 }
		);
	}

	// Optionally, you can construct public URLs for each file
	const filesWithUrls = files?.map((file) => {
		const {
			data: { publicUrl },
		} = supabase.storage
			.from("screenshots")
			.getPublicUrl(`${userId}/${file.name}`);
		return {
			...file,
			publicUrl,
		};
	});

	return NextResponse.json({ files: filesWithUrls as UserScreenshot[] });
}
