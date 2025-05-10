import 'package:flutter/foundation.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PhotoProvider {
  /// Uploads every image in every album, with per-asset error handling.
Future<void> syncAll() async {
  try {
    // initialize Supabase client and get current user ID
    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id ?? '1';
    final albums = await PhotoManager.getAssetPathList(type: RequestType.image);

    for (final album in albums) {
      final int count = await album.assetCountAsync;

      // ◀︎ Skip empty albums so size>0 always holds
      if (count <= 0) {
        debugPrint('⚠️ Album "${album.name}" is empty, skipping.');
        continue;
      }

      final photos = await album.getAssetListPaged(page: 0, size: count);

      for (final asset in photos) {
        try {
          final file = await asset.file;
          if (file == null) {
            debugPrint('⚠️ Asset ${asset.id} has no file, skipping.');
            continue;
          }
          // determine remote path and upload to Supabase storage
          // use the asset ID up to (but not including) the first '/' as the filename
          final fileName = asset.id.split('/').first;
          final storagePath = '$userId/$fileName';
          debugPrint('Attempting at uploading $storagePath'); 
          await supabase.storage
              .from('screenshots')
              .upload(storagePath, file, fileOptions: const FileOptions(upsert: false));
          debugPrint('✅ Uploaded $storagePath');        } 
        catch (e, st) {
          debugPrint('❌ Failed to process asset ${asset.id}: $e\n$st');
        }
      }
    }
  } catch (e, st) {
    debugPrint('❌ syncAll failed entirely: $e\n$st');
    rethrow;
  }
}

  /// Deletes ALL previously uploaded photos from your cloud.
  Future<void> unsyncAll() async {
    try {
     // delete all objects under screenshots/<user_id>/...
     final supabase = Supabase.instance.client;
     final userId = supabase.auth.currentUser?.id ?? '1';
     // list everything under screenshots/<user_id>/ recursively
     final List<FileObject> files = await supabase.storage
         .from('screenshots')
         .list(path: userId);
     for (final file in files) {
       final key = '$userId/${file.name}';
        debugPrint(key);
        // remove() returns a List<FileObject> of deleted items
        final List<FileObject> removed = await supabase.storage
            .from('screenshots')
            .remove([key]);

        debugPrint(removed.toString());
        if (removed.isNotEmpty) {
          debugPrint('✅ Deleted screenshots/$key');
        } else {
          debugPrint(
            '⚠️ No file removed (it may not exist): screenshots/$key'
          );
        }
     }
    } catch (e, st) {
      debugPrint('❌ unsyncAll failed: $e\n$st');
      rethrow;
    }
  }

  /// Returns the number of photos currently synced in Supabase storage.
  Future<int> getSyncedCount() async {
    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id ?? '1';
    // list files under the user's folder
    final List<FileObject> files = await supabase.storage
        .from('screenshots')
        .list(path: userId);
    return files.length;
  }

  /// Uploads only images from the specified album.
  Future<void> syncAlbum(String albumId) async {
    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id ?? '1';
      // find the album by ID
      final album = (await PhotoManager.getAssetPathList(type: RequestType.image))
          .firstWhere((a) => a.id == albumId);
      final int count = await album.assetCountAsync;
      if (count <= 0) return;
      final photos = await album.getAssetListPaged(page: 0, size: count);
      for (final asset in photos) {
        try {
          final file = await asset.file;
          if (file == null) continue;
          final fileName = asset.id.split('/').first;
          final storagePath = '$userId/$fileName';
          await supabase.storage
              .from('screenshots')
              .upload(storagePath, file, fileOptions: const FileOptions(upsert: false));
          debugPrint('✅ Uploaded $storagePath');
        } catch (e, st) {
          debugPrint('❌ Failed syncing asset ${asset.id}: $e\n$st');
        }
      }
    } catch (e, st) {
      debugPrint('❌ syncAlbum failed: $e\n$st');
      rethrow;
    }
  }

  /// Deletes only photos in the specified album.
  Future<void> unsyncAlbum(String albumId) async {
    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id ?? '1';
      final prefix = userId;
      final List<FileObject> files = await supabase.storage
          .from('screenshots')
          .list(path: prefix);
      for (final file in files) {
        final key = '$prefix/${file.name}';
        final removed = await supabase.storage.from('screenshots').remove([key]);
        if (removed.isNotEmpty) {
          debugPrint('🗑️ Deleted $key');
        } else {
          debugPrint('⚠️ No file removed: $key');
        }
      }
    } catch (e, st) {
      debugPrint('❌ unsyncAlbum failed: $e\n$st');
      rethrow;
    }
  }

}
