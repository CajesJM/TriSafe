import 'package:flutter/material.dart';
import '../../models/driver_rating_models.dart';
import '../../theme/trisafe_theme.dart';
import '../../widgets/driver_page_header.dart';

/// Read-only passenger feedback for the signed-in driver. Passenger identity
/// is deliberately not included in this view.
class DriverRatingStatisticsScreen extends StatelessWidget {
  final DriverRatingStatistics statistics;

  const DriverRatingStatisticsScreen({super.key, required this.statistics});

  @override
  Widget build(BuildContext context) {
    final average = statistics.average;
    final highestCount = statistics.distribution.fold<int>(
        0, (highest, item) => item.count > highest ? item.count : highest);

    return Scaffold(
      backgroundColor: TriSafeColors.offWhite,
      appBar: AppBar(title: const Text('Rating statistics')),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
          children: [
            const DriverPageHeader(
              eyebrow: 'PASSENGER FEEDBACK',
              title: 'Rating statistics',
              description:
                  'See the ratings and visible feedback submitted after completed rides.',
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: TriSafeColors.black,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(children: [
                Container(
                  width: 82,
                  height: 82,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                      color: TriSafeColors.lime, shape: BoxShape.circle),
                  child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(average?.toStringAsFixed(1) ?? '—',
                            style: const TextStyle(
                                color: TriSafeColors.black,
                                fontSize: 25,
                                fontWeight: FontWeight.w900)),
                        const Icon(Icons.star_rounded,
                            color: TriSafeColors.black, size: 17),
                      ]),
                ),
                const SizedBox(width: 17),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('YOUR CURRENT RATING',
                            style: TextStyle(
                                color: TriSafeColors.lime,
                                fontSize: 9,
                                letterSpacing: 1,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 5),
                        Text(
                          statistics.totalReviews == 0
                              ? 'No reviews yet'
                              : '${statistics.totalReviews} passenger review${statistics.totalReviews == 1 ? '' : 's'}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Ratings are shown after an LGU-visible passenger submission.',
                          style: TextStyle(
                              color: Color(0xffcbd1cb),
                              fontSize: 10,
                              height: 1.4),
                        ),
                      ]),
                ),
              ]),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(17),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('RATING BREAKDOWN',
                          style: TextStyle(
                              color: TriSafeColors.forest,
                              fontSize: 9,
                              letterSpacing: 1,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 14),
                      ...statistics.distribution
                          .map((item) => _RatingDistributionRow(
                                item: item,
                                highestCount: highestCount,
                              )),
                    ]),
              ),
            ),
            const SizedBox(height: 20),
            const Text('RECENT PASSENGER FEEDBACK',
                style: TextStyle(
                    color: TriSafeColors.forest,
                    fontSize: 10,
                    letterSpacing: 1,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 9),
            if (statistics.reviews.isEmpty)
              const _NoReviewsCard()
            else
              ...statistics.reviews.take(10).map(_ReviewCard.new),
            const SizedBox(height: 15),
            const Text(
              'Passenger identities are not displayed. Ratings are view-only and can only be moderated by the LGU when needed.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: TriSafeColors.muted, fontSize: 9, height: 1.45),
            ),
          ],
        ),
      ),
    );
  }
}

class _RatingDistributionRow extends StatelessWidget {
  final DriverRatingDistribution item;
  final int highestCount;
  const _RatingDistributionRow(
      {required this.item, required this.highestCount});

  @override
  Widget build(BuildContext context) {
    final widthFactor = highestCount == 0 ? 0.0 : item.count / highestCount;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        SizedBox(
          width: 35,
          child: Row(children: [
            Text('${item.score}',
                style:
                    const TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
            const Icon(Icons.star_rounded, size: 13, color: Color(0xffa67300)),
          ]),
        ),
        Expanded(
          child: LayoutBuilder(builder: (context, constraints) {
            return Stack(children: [
              Container(
                  height: 9,
                  decoration: BoxDecoration(
                      color: const Color(0xffedf0ed),
                      borderRadius: BorderRadius.circular(99))),
              AnimatedContainer(
                  duration: const Duration(milliseconds: 260),
                  height: 9,
                  width: constraints.maxWidth * widthFactor,
                  decoration: BoxDecoration(
                      color: TriSafeColors.forest,
                      borderRadius: BorderRadius.circular(99))),
            ]);
          }),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 18,
          child: Text('${item.count}',
              textAlign: TextAlign.right,
              style:
                  const TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
        ),
      ]),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final DriverRatingReview review;
  const _ReviewCard(this.review);

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              ...List.generate(
                  5,
                  (index) => Icon(Icons.star_rounded,
                      size: 17,
                      color: index < review.score
                          ? const Color(0xffb57b00)
                          : const Color(0xffdde2dc))),
              const Spacer(),
              Text(_date(review.createdAt),
                  style: const TextStyle(
                      color: TriSafeColors.muted,
                      fontSize: 9,
                      fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 9),
            Text(
              review.comment?.trim().isNotEmpty == true
                  ? review.comment!
                  : 'No written feedback was provided.',
              style: TextStyle(
                color: review.comment?.trim().isNotEmpty == true
                    ? TriSafeColors.charcoal
                    : TriSafeColors.muted,
                fontSize: 11,
                height: 1.5,
                fontStyle: review.comment?.trim().isNotEmpty == true
                    ? FontStyle.normal
                    : FontStyle.italic,
              ),
            ),
          ]),
        ),
      );
}

class _NoReviewsCard extends StatelessWidget {
  const _NoReviewsCard();

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(26),
          child: Column(children: const [
            Icon(Icons.star_outline_rounded,
                size: 40, color: TriSafeColors.forest),
            SizedBox(height: 11),
            Text('No passenger ratings yet',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
            SizedBox(height: 5),
            Text(
              'Your rating statistics will appear here after passengers rate completed rides.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, color: TriSafeColors.muted),
            ),
          ]),
        ),
      );
}

String _date(DateTime value) =>
    '${value.month.toString().padLeft(2, '0')}/${value.day.toString().padLeft(2, '0')}/${value.year}';
