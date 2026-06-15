:ON ERROR EXIT
/*
  FluentCopilot Azure SQL clean database bootstrap.

  Run this from the repository root with sqlcmd against an empty Azure SQL database:

    sqlcmd -S sql-language-tutor-dev.database.windows.net,1433 -d LanguageTutor -U sqladmin -P "<password>" -N -C -i backend/database/azure_clean_create_and_seed.sql

  This script intentionally excludes rollback scripts. It includes the optional sample-thread
  seed file, but that file is skipped by default because @Run = 0 inside the seed.
*/

PRINT N'FluentCopilot Azure SQL bootstrap starting.';
GO

:r backend/database/schema/001_initial_schema.sql

:r backend/database/seed/001_seed_reference_data.sql
:r backend/database/seed/002_seed_mock_scenarios.sql
:r backend/database/seed/003_seed_personas.sql
:r backend/database/seed/004_seed_sample_thread_optional.sql

:r backend/database/migrations/002_example_add_column_placeholder.sql
:r backend/database/migrations/003_conversation_surface.sql
:r backend/database/migrations/004_speak_live_fsm_state.sql
:r backend/database/migrations/005_live_voice_evaluation.sql
:r backend/database/migrations/006_saved_training_training_rails.sql
:r backend/database/migrations/007_one_active_thread_per_user_scenario.sql
:r backend/database/migrations/008_speak_live_post_session_phase.sql
:r backend/database/migrations/009_speak_live_post_session_phase_verifying.sql
:r backend/database/migrations/010_ensure_ordering_food_scenario.sql
:r backend/database/migrations/011_food_service_persona_display_nl.sql
:r backend/database/migrations/012_supermarket_shop_scenario.sql
:r backend/database/migrations/013_supermarket_shop_starter_suggestions.sql
:r backend/database/migrations/014_directions_getting_somewhere_scenario.sql
:r backend/database/migrations/015_directions_learner_first_description.sql
:r backend/database/migrations/016_booking_reservations_scenario.sql
:r backend/database/migrations/017_doctor_pharmacy_scenario.sql
:r backend/database/migrations/018_store_service_issue_scenario.sql
:r backend/database/migrations/019_work_colleague_interaction_scenario.sql
:r backend/database/migrations/020_housing_landlord_scenario.sql
:r backend/database/migrations/021_speak_live_persona_intro_greeting_help.sql
:r backend/database/migrations/022_work_colleague_persona_intro_peer_tone.sql
:r backend/database/migrations/023_phone_call_scenario.sql
:r backend/database/migrations/024_small_talk_scenario.sql
:r backend/database/migrations/025_meeting_new_people_scenario.sql
:r backend/database/migrations/026_party_social_scenario.sql
:r backend/database/migrations/027_explaining_something_scenario.sql
:r backend/database/migrations/028_storytelling_scenario.sql
:r backend/database/migrations/029_opinions_discussions_scenario.sql
:r backend/database/migrations/030_language_coach_scenario.sql
:r backend/database/migrations/031_meeting_new_people_persona_intro_with_name.sql
:r backend/database/migrations/032_user_learning_memory.sql
:r backend/database/migrations/033_skill_system_document_storage.sql
:r backend/database/migrations/034_personalized_training_loops.sql
:r backend/database/migrations/035_training_loop_events_and_indexes.sql
:r backend/database/migrations/036_training_loop_completion_result.sql
:r backend/database/migrations/037_listening_mode.sql
:r backend/database/migrations/038_session_learning_insights_listening.sql
:r backend/database/migrations/039_training_loop_listening_source.sql
:r backend/database/migrations/040_user_quick_capture.sql
:r backend/database/migrations/041_quick_capture_domain_model.sql
:r backend/database/migrations/042_training_loop_quick_capture_source.sql
:r backend/database/migrations/043_generated_exercise_packs.sql
:r backend/database/migrations/044_exam_persistence.sql
:r backend/database/migrations/045_speak_live_eval_progress.sql
:r backend/database/migrations/046_session_learning_insights_session_type_data_fix.sql

PRINT N'FluentCopilot Azure SQL bootstrap verification.';
GO

SELECT
  (SELECT COUNT(*) FROM dbo.Users) AS Users,
  (SELECT COUNT(*) FROM dbo.ScenarioDefinitions) AS ScenarioDefinitions,
  (SELECT COUNT(*) FROM dbo.PersonaDefinitions) AS PersonaDefinitions,
  (SELECT COUNT(*) FROM dbo.ExamProfiles) AS ExamProfiles;
GO

SELECT Slug, Title, IsActive
FROM dbo.ScenarioDefinitions
ORDER BY Slug;
GO

SELECT Slug, DisplayName, IsActive
FROM dbo.PersonaDefinitions
ORDER BY Slug;
GO

PRINT N'FluentCopilot Azure SQL bootstrap complete.';
GO
