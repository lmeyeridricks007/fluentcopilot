# Sub-Feature: Lesson Catalog

**Feature**: Core Lessons (FD-02)  
**Sub-feature**: lesson-catalog

---

## 1. Purpose

Provide a filterable, paginated list of published lessons so users can browse and select lessons by level, topic, and exam tag. The catalog is the entry point for the “Learn” tab and supports “Continue” (in-progress) and “Completed” badges per user.

---

## 2. Core Concept

- **Catalog**: Read-only list of lessons with status=published, filtered by user level (and optional stretch), topic, exam_tag. Each lesson includes metadata (title, level, topic, duration estimate) and optional user progress (in_progress, completed) when authenticated.
- **No cap check**: Listing does not consume or check usage; cap is enforced only when starting a specific lesson (lesson-run).

---

## 3. User Problems Solved

- Discover lessons by level and topic.
- See which lessons are in progress or completed.
- Support “Continue” and “Recommended” sections on Home/Learn.

---

## 4. Trigger Conditions

- User opens Learn tab or Home “Browse lessons.”
- Client requests list with optional filters (level, topic, exam_tag, sort, limit, offset).

---

## 5. Inputs

- **Query**: level (CEFR code), topic (string), exam_tag (string), limit (default 20), offset (default 0), sort (recommended | level | topic | recent).
- **Auth**: user_id from session (optional for public catalog; if authenticated, attach progress badges).
- **Profile**: user level from Profile service for server-side level filter (lesson.level <= user.level or stretch_1).

---

## 6. Outputs

- **200**: JSON with `lessons[]` and `total`. Each lesson: id, external_id, title, title_key, cefr_level, topic, topic_tags, exam_tags, duration_estimate_min, in_progress (boolean), completed (boolean).
- **400**: Invalid query params.
- **401**: If endpoint requires auth and token missing (catalog may allow anonymous with no progress badges).

---

## 7. Workflow / Lifecycle

1. Client sends GET /v1/lessons?level=A1&topic=food&limit=20&offset=0.
2. API validates query; loads user_id and user level from auth and Profile.
3. Query lessons table: status=published, cefr_level_id <= user level (or stretch), topic/topic_tags/exam_tags match if provided. Order by sort param. Paginate limit/offset.
4. Optionally join lesson_progress for user_id to set in_progress and completed per lesson.
5. Return lessons array and total count.

---

## 8. Business Rules

- Only lessons with status=published appear (BR, FD02-FR-001).
- Level filter: strict (lesson.level <= user.level) or stretch_1 (lesson.level <= user.level + 1); configurable.
- Catalog does not increment usage or check cap.

---

## 9. Configuration Model

- **catalog.level_filter**: strict | stretch_1.
- **catalog.lesson_status_visible**: ["published"].
- **catalog.default_limit**: 20; max_limit: 100.
- **catalog.sort_options**: recommended, level, topic, recent.

---

## 10. Data Model

**Read from**:

- **lessons**: id, locale, lesson_template_id, external_id, title, title_key, cefr_level_id, topic, topic_tags, exam_tags, content_payload (not returned in list), status, duration_estimate_min (or computed), created_at. Indexes: (locale, status), (locale, cefr_level_id), (topic_tags), (exam_tags).
- **lesson_progress** (optional join): user_id, lesson_id, status. For in_progress and completed flags.

**No write** in this sub-feature.

---

## 11. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/lessons | List lessons with query params. |

**Example request**: `GET /v1/lessons?level=A1&topic=food&limit=20&offset=0&sort=level`

**Example response** (200):

```json
{
  "lessons": [
    {
      "id": 42,
      "external_id": "food-basics-a1",
      "title": "Food basics",
      "title_key": "lessons.food.basics",
      "cefr_level": "A1",
      "topic": "food",
      "topic_tags": ["food", "daily_life"],
      "exam_tags": [],
      "duration_estimate_min": 8,
      "in_progress": true,
      "completed": false
    }
  ],
  "total": 100
}
```

---

## 12. Events Produced

- None. Catalog is read-only. Optional analytics: catalog_viewed (user_id, filters) for product.

---

## 13. Events Consumed

- None. Uses current state of lessons and lesson_progress.

---

## 14. Integrations

- **Profile**: Get user level for filter (or pass from client with validation).
- **Lesson Engine / DB**: Read lessons and lesson_progress.
- **Content**: Lessons and status from content pipeline; this sub-feature only reads.

---

## 15. UI Components

- **LessonListScreen**: Container; uses catalog API.
- **LessonCard**: Displays one lesson (title, level, topic, duration, in_progress/completed badge); tap → navigate to lesson run.
- **FilterBar**: Level, topic, exam tag dropdowns or chips; sort selector.
- **Pagination**: Load more or infinite scroll using offset/limit.

---

## 16. UI Screens

- **Learn / Catalog**: Main screen for lesson list; filter and sort; “Continue” block at top (from progress, not catalog response) or integrated in list.

---

## 17. Permissions & Security

- Authenticated: optional; if not authenticated, do not attach in_progress/completed (or return empty progress). Catalog can be public read for marketing.
- User only sees own progress flags; filter lesson_progress by user_id.
- Only published lessons; no draft/archived in response.

---

## 18. Error Handling

- Invalid query (e.g. invalid level code): 400 with message.
- DB error: 500; do not leak schema.
- Empty result: 200 with lessons=[], total=0.

---

## 19. Edge Cases

- User level not set (new user): use default (e.g. A0) or return all levels; product decision.
- Very large total: pagination only; no “load all.”
- Topic/exam_tag typo: no match; return empty or suggest valid values (optional).

---

## 20. Performance Considerations

- Index on (locale, status, cefr_level_id), (topic_tags), (exam_tags). Paginate; avoid full table scan.
- Optional cache for catalog slice (e.g. by filter hash) with short TTL; invalidate on content publish.
- Join with lesson_progress: batch by user_id; avoid N+1.

---

## 21. Observability

- Log: request_id, filter params, result count, latency. No PII.
- Metric: catalog_requests_total (by filter), catalog_latency_seconds.
- Optional: catalog_viewed analytics event.

---

## 22. Example Scenarios

**Scenario A**: User opens Learn, no filters. GET /v1/lessons?limit=20&offset=0. Response: 20 lessons, user level A1 so only A0/A1. Two lessons have in_progress=true and completed=true from join.

**Scenario B**: User filters by topic=food. GET /v1/lessons?topic=food&level=A1&limit=20. Response: lessons where topic or topic_tags contain food, level A1.

---

## 23. Implementation Notes

- Backend: single endpoint in Lesson Engine or BFF; query lessons table with filters; optional join lesson_progress. Use parameterized queries; enforce max limit.
- Frontend: call on Learn mount; store in state or SWR/React Query; pass filters from FilterBar. “Continue” can come from GET /progress/lessons?status=in_progress and merge with catalog or separate section.
- DB: ensure indexes exist; explain plan for slow queries.

---

## 24. Testing Requirements

- **Unit**: Filter logic (level, topic, exam_tag); sort; pagination (limit, offset).
- **Integration**: GET /v1/lessons with various filters; verify only published; verify in_progress/completed when authenticated; 400 for invalid params.
- **E2E**: Open Learn; see list; change filter; see updated list; tap lesson → navigates to run.
