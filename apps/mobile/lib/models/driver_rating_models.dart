class DriverRatingDistribution {
  final int score;
  final int count;

  DriverRatingDistribution.fromJson(Map<String, dynamic> json)
      : score = (json['score'] as num).toInt(),
        count = (json['count'] as num).toInt();
}

class DriverRatingReview {
  final String id;
  final int score;
  final String? comment;
  final DateTime createdAt;

  DriverRatingReview.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        score = (json['score'] as num).toInt(),
        comment = json['comment'] as String?,
        createdAt = DateTime.parse(json['createdAt'].toString());
}

class DriverRatingStatistics {
  final double? average;
  final int totalReviews;
  final List<DriverRatingDistribution> distribution;
  final List<DriverRatingReview> reviews;

  DriverRatingStatistics.fromJson(Map<String, dynamic> json)
      : average = (json['average'] as num?)?.toDouble(),
        totalReviews = (json['totalReviews'] as num? ?? 0).toInt(),
        distribution = (json['distribution'] as List<dynamic>? ?? const [])
            .map((item) =>
                DriverRatingDistribution.fromJson(item as Map<String, dynamic>))
            .toList(),
        reviews = (json['reviews'] as List<dynamic>? ?? const [])
            .map((item) =>
                DriverRatingReview.fromJson(item as Map<String, dynamic>))
            .toList();
}
