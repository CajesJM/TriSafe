class PublishedTermsDocument {
  final String id;
  final String version;
  final String title;
  final String content;
  final DateTime? effectiveFrom;
  final DateTime? publishedAt;

  PublishedTermsDocument.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        version = json['version'] as String,
        title = json['title'] as String,
        content = json['content'] as String,
        effectiveFrom = json['effectiveFrom'] == null
            ? null
            : DateTime.parse(json['effectiveFrom'].toString()),
        publishedAt = json['publishedAt'] == null
            ? null
            : DateTime.parse(json['publishedAt'].toString());
}
