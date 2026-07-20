import 'package:flutter_test/flutter_test.dart';
import 'package:trisafe_mobile/main.dart';

void main() {
  testWidgets('TriSafe home renders', (WidgetTester tester) async {
    await tester.pumpWidget(const TriSafeApp());
    expect(find.text('Welcome to TriSafe'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
