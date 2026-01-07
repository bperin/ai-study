--
-- PostgreSQL database dump
--

\restrict yJRXuUGGqy3BhezlYyXhRusahqasGzMKAaLwNHmIiv44cNhVzW4mwtxAQImbcy8

-- Dumped from database version 17.7 (Homebrew)
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: artifact_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.artifact_status AS ENUM (
    'PENDING_GENERATION',
    'PENDING_EVAL',
    'APPROVED',
    'REJECTED',
    'RETIRED'
);


--
-- Name: artifact_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.artifact_type AS ENUM (
    'MCQ_ITEM',
    'FLASHCARD',
    'STUDY_PLAN'
);


--
-- Name: eval_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.eval_type AS ENUM (
    'SCHEMA_VALIDATION',
    'GROUNDEDNESS',
    'ANSWER_CORRECTNESS',
    'DISTRACTOR_QUALITY',
    'DIFFICULTY_CALIBRATION',
    'CONCEPT_ALIGNMENT'
);


--
-- Name: run_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.run_status AS ENUM (
    'PENDING',
    'RUNNING',
    'SUCCEEDED',
    'FAILED'
);


--
-- Name: user_role_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_type AS ENUM (
    'ADMIN',
    'INSTRUCTOR',
    'LEARNER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    generation_run_id uuid NOT NULL,
    type public.artifact_type NOT NULL,
    status public.artifact_status DEFAULT 'PENDING_EVAL'::public.artifact_status NOT NULL,
    schema_version text NOT NULL,
    difficulty text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    artifact_payload jsonb NOT NULL,
    grounding jsonb DEFAULT '{}'::jsonb NOT NULL,
    evidence_version text,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    session_id uuid NOT NULL,
    artifact_id uuid NOT NULL,
    is_correct boolean NOT NULL,
    user_answer jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    title text,
    source_uri text NOT NULL,
    sha256 text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    file_name text,
    doc_name text,
    indexed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_id uuid NOT NULL
);


--
-- Name: eval_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eval_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eval_run_id uuid NOT NULL,
    pass boolean NOT NULL,
    score real,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    rule_id uuid NOT NULL
);


--
-- Name: eval_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eval_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suite_id uuid NOT NULL,
    eval_type public.eval_type NOT NULL,
    min_score real,
    max_score real,
    weight real DEFAULT 1.0 NOT NULL,
    hard_fail boolean DEFAULT false NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: eval_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eval_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    artifact_id uuid NOT NULL,
    generation_run_id uuid,
    suite_id uuid NOT NULL,
    judge_model text NOT NULL,
    judge_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.run_status DEFAULT 'PENDING'::public.run_status NOT NULL,
    overall_pass boolean,
    overall_score real,
    error jsonb,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: eval_suites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eval_suites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text DEFAULT ''::text NOT NULL
);


--
-- Name: file_search_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_search_stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_name text NOT NULL,
    display_name text,
    chunking_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_id uuid NOT NULL
);


--
-- Name: generation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    agent_name text NOT NULL,
    agent_version text NOT NULL,
    model text NOT NULL,
    model_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    prompt_id uuid,
    store_name text NOT NULL,
    metadata_filter jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.run_status DEFAULT 'PENDING'::public.run_status NOT NULL,
    input_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    output_payload jsonb,
    error jsonb,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: goose_db_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goose_db_version (
    id integer NOT NULL,
    version_id bigint NOT NULL,
    is_applied boolean NOT NULL,
    tstamp timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: goose_db_version_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.goose_db_version ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.goose_db_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text
);


--
-- Name: prompt_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    module_id uuid NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    mastery_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role public.user_role_type NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: artifacts artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_pkey PRIMARY KEY (id);


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_subject_id_source_uri_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_subject_id_source_uri_key UNIQUE (subject_id, source_uri);


--
-- Name: eval_results eval_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_results
    ADD CONSTRAINT eval_results_pkey PRIMARY KEY (id);


--
-- Name: eval_results eval_results_unique_rule_per_run; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_results
    ADD CONSTRAINT eval_results_unique_rule_per_run UNIQUE (eval_run_id, rule_id);


--
-- Name: eval_rules eval_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_rules
    ADD CONSTRAINT eval_rules_pkey PRIMARY KEY (id);


--
-- Name: eval_rules eval_rules_suite_id_eval_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_rules
    ADD CONSTRAINT eval_rules_suite_id_eval_type_key UNIQUE (suite_id, eval_type);


--
-- Name: eval_runs eval_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_runs
    ADD CONSTRAINT eval_runs_pkey PRIMARY KEY (id);


--
-- Name: eval_suites eval_suites_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_suites
    ADD CONSTRAINT eval_suites_name_key UNIQUE (name);


--
-- Name: eval_suites eval_suites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_suites
    ADD CONSTRAINT eval_suites_pkey PRIMARY KEY (id);


--
-- Name: file_search_stores file_search_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_search_stores
    ADD CONSTRAINT file_search_stores_pkey PRIMARY KEY (id);


--
-- Name: file_search_stores file_search_stores_store_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_search_stores
    ADD CONSTRAINT file_search_stores_store_name_key UNIQUE (store_name);


--
-- Name: generation_runs generation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_runs
    ADD CONSTRAINT generation_runs_pkey PRIMARY KEY (id);


--
-- Name: goose_db_version goose_db_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goose_db_version
    ADD CONSTRAINT goose_db_version_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: prompt_versions prompt_versions_name_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_name_version_key UNIQUE (name, version);


--
-- Name: prompt_versions prompt_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_user_id_name_key UNIQUE (user_id, name);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: idx_artifacts_pending_eval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artifacts_pending_eval ON public.artifacts USING btree (status, created_at DESC) WHERE (status = 'PENDING_EVAL'::public.artifact_status);


--
-- Name: idx_attempts_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attempts_session ON public.attempts USING btree (session_id, created_at DESC);


--
-- Name: idx_eval_results_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eval_results_rule ON public.eval_results USING btree (rule_id);


--
-- Name: idx_eval_rules_suite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eval_rules_suite ON public.eval_rules USING btree (suite_id);


--
-- Name: idx_generation_runs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_runs_module ON public.generation_runs USING btree (module_id, created_at DESC);


--
-- Name: idx_modules_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modules_tenant ON public.modules USING btree (tenant_id);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id, created_at DESC);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: ux_file_search_store_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_file_search_store_subject ON public.file_search_stores USING btree (subject_id);


--
-- Name: artifacts artifacts_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.generation_runs(id) ON DELETE CASCADE;


--
-- Name: artifacts artifacts_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.artifacts(id) ON DELETE RESTRICT;


--
-- Name: attempts attempts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documents documents_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.file_search_stores(id) ON DELETE CASCADE;


--
-- Name: documents documents_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: eval_results eval_results_eval_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_results
    ADD CONSTRAINT eval_results_eval_run_id_fkey FOREIGN KEY (eval_run_id) REFERENCES public.eval_runs(id) ON DELETE CASCADE;


--
-- Name: eval_results eval_results_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_results
    ADD CONSTRAINT eval_results_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.eval_rules(id) ON DELETE CASCADE;


--
-- Name: eval_rules eval_rules_suite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_rules
    ADD CONSTRAINT eval_rules_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.eval_suites(id) ON DELETE CASCADE;


--
-- Name: eval_runs eval_runs_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_runs
    ADD CONSTRAINT eval_runs_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.artifacts(id) ON DELETE CASCADE;


--
-- Name: eval_runs eval_runs_generation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_runs
    ADD CONSTRAINT eval_runs_generation_run_id_fkey FOREIGN KEY (generation_run_id) REFERENCES public.generation_runs(id);


--
-- Name: eval_runs eval_runs_suite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eval_runs
    ADD CONSTRAINT eval_runs_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.eval_suites(id);


--
-- Name: file_search_stores file_search_stores_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_search_stores
    ADD CONSTRAINT file_search_stores_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: generation_runs generation_runs_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_runs
    ADD CONSTRAINT generation_runs_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: generation_runs generation_runs_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_runs
    ADD CONSTRAINT generation_runs_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompt_versions(id);


--
-- Name: modules modules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict yJRXuUGGqy3BhezlYyXhRusahqasGzMKAaLwNHmIiv44cNhVzW4mwtxAQImbcy8

