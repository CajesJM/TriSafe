import 'package:flutter/material.dart';
import '../../models/ride_models.dart';
import '../../services/trisafe_api.dart';
import '../../widgets/ride_history_card.dart';

class RideHistoryScreen extends StatefulWidget {
  final TriSafeApi api;

  const RideHistoryScreen({super.key, required this.api});

  @override
  State<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends State<RideHistoryScreen> {
  List<Ride> rides = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final history = await widget.api.rideHistory();
      if (!mounted) {
        return;
      }
      setState(() {
        rides = history;
        loading = false;
      });
    } catch (exception) {
      if (!mounted) {
        return;
      }
      setState(() {
        error = exception.toString();
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride history'),
        actions: [
          IconButton(
            onPressed: loading ? null : _loadHistory,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh ride history',
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHistory,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  const Text(
                    'Your rides',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Review tracked trip distances and official final fares.',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 18),
                    _ErrorMessage(message: error!),
                  ] else if (rides.isEmpty) ...[
                    const SizedBox(height: 80),
                    const Icon(Icons.route_outlined,
                        size: 64, color: Color(0xff8ca39b)),
                    const SizedBox(height: 16),
                    const Center(
                      child: Text('No rides recorded yet',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        'Your completed and active rides will appear here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 20),
                    ...rides.map((ride) => RideHistoryCard(ride: ride)),
                  ],
                ],
              ),
            ),
    );
  }
}

class _ErrorMessage extends StatelessWidget {
  final String message;

  const _ErrorMessage({required this.message});

  @override
  Widget build(BuildContext context) => Card(
        color: Colors.red.shade50,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Text(message, style: TextStyle(color: Colors.red.shade800)),
        ),
      );
}
