import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'photo_provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:photo_manager/photo_manager.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: 'https://hqnrmtleqqbqxmwwbnqv.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
        'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxbnJtdGxlcXFicXhtd3dibnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzM1MzUsImV4cCI6MjA2MjQ0OTUzNX0.'
        '7Mbg7G51Ig-57qFJZfU6Wy5LZie-QgV-Ig-9YDuaHWY',
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Supership',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF000000),
          primary: const Color(0xFF000000),
          secondary: const Color(0xFF000000),
          background: Colors.white,
        ),
        textTheme: GoogleFonts.interTextTheme(),
        useMaterial3: true,
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(30),
            ),
          ),
        ),
      ),
      home: const MyHomePage(title: 'Supership'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  bool _isLoading = false;
  int _syncedPhotos = 0;
  List<AssetPathEntity> _albums = [];
  AssetPathEntity? _selectedAlbum;
  
  @override
  void initState() {
    super.initState();
    _requestGalleryPermission();
    _getSyncedCount();
    // Load albums for selection dropdown
    PhotoManager.getAssetPathList(type: RequestType.image).then((list) {
      setState(() {
        _albums = list;
        if (_albums.isNotEmpty) _selectedAlbum = _albums.first;
      });
    });
  }


  Future<void> _getSyncedCount() async {
    try {
      final count = await PhotoProvider().getSyncedCount();
      setState(() {
        _syncedPhotos = count;
      });
    } catch (e) {
      // Handle error
    }
  }


  Future<void> _requestGalleryPermission() async {
    final status = await Permission.photos.request();
    if (status.isDenied) {
      await Permission.storage.request();
    }
    if (!mounted) return;
    if (!(await Permission.photos.status).isGranted && 
        !(await Permission.storage.status).isGranted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gallery access is required to sync.')),
      );
    }
  }

  Future<void> _syncGallery() async {
    setState(() => _isLoading = true);
    try {
      if (_selectedAlbum != null) {
        await PhotoProvider().syncAlbum(_selectedAlbum!.id);
      } else {
        await PhotoProvider().syncAll();
      }
      if (!mounted) return;
      await _getSyncedCount();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Sync finished successfully'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Sync failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _unsyncGallery() async {
    setState(() => _isLoading = true);
    try {
      if (_selectedAlbum != null) {
        await PhotoProvider().unsyncAlbum(_selectedAlbum!.id);
      } else {
        await PhotoProvider().unsyncAll();
      }

      if (!mounted) return;
      await _getSyncedCount();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Unsync finished successfully'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Unsync failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(),
                Expanded(
                  child: _buildBody(),
                ),
                _buildFooter(),
              ],
            ),
          ),
        ),
        if (_isLoading)
          Container(
            color: Colors.black.withOpacity(0.5),
            alignment: Alignment.center,
            child: const CircularProgressIndicator(
              color: Colors.white,
            ),
          ),
      ],
    );
  }

  Widget _buildHeader() {
   return Container(
     padding: const EdgeInsets.all(16),
     child: Row(
       children: [
         SvgPicture.asset(
           'lib/assets/supership_logo.svg',
           width: 24,
           height: 24,
           color: Theme.of(context).colorScheme.primary,
         ),
         const SizedBox(width: 8),
         Text(
           widget.title,
           style: const TextStyle(
             fontSize: 20,
             fontWeight: FontWeight.bold,
           ),
         ),
       ],
     ),
   );
  }

  Widget _buildBody() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.cloud_sync,
            size: 80,
            color: Colors.black,
          ),
          const SizedBox(height: 24),
          Text(
            'Gallery Sync',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Sync your photos to the cloud and access them anywhere',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.black54,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            '$_syncedPhotos photos synced',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.black54,
                ),
            textAlign: TextAlign.center,
          ),
          // Album selector
          if (_albums.isNotEmpty) ...[
            const SizedBox(height: 32),
            DropdownButton<AssetPathEntity>(
              value: _selectedAlbum,
              items: _albums.map((album) {
                return DropdownMenuItem(
                  value: album,
                  child: Text('${album.name} '), // (${album.assetCount})
                );
              }).toList(),
              onChanged: (album) => setState(() => _selectedAlbum = album),
            ),
          ],
          const SizedBox(height: 48),
          _buildSyncButton(),
          const SizedBox(height: 16),
          _buildUnsyncButton(),
        ],
      ),
    );
  }

  Widget _buildSyncButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _syncGallery,
        icon: const Icon(Icons.sync, color: Colors.white),
        label: const Text(
          'Sync Photos',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Widget _buildUnsyncButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _unsyncGallery,
        icon: const Icon(Icons.delete_outline, color: Colors.black),
        label: const Text(
          'Unsync Photos',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.black),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const Divider(),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                '© 2025 Supership, Inc.',
                style: TextStyle(
                  color: Colors.black54,
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'All rights reserved',
                style: TextStyle(
                  color: Colors.black54,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
