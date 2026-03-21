# taskgraph

<p align="center">
  <img src="./assets/taskgraph-graph.png" alt="A hand-drawn graph of many connected task nodes." width="320" />
</p>

taskgraph is an Obsidian-first task system for managing work as a readable, editable graph.

This organization is shaped around three repositories:

- `config`
- `public-vault`
- `private-vault`

It is built around two simple rules:

- Every task is a file.
- Every task is a graph.

It aims to make task management calm, precise, beautiful, and enjoyable without giving up structure.

## Design principles

- every task is a file
- every task participates in a graph
- public and private knowledge stay separated by default
- weekly and monthly focus remain visible at the note level and on the public dashboard
- all content and conventions are written in English
- schema and graph integrity should be mechanically verifiable

## Purpose

taskgraph exists to make long-running work easier to see and easier to steer.

- turn tasks into durable notes instead of disposable checklist items
- keep relationships between tasks explicit
- make weekly and monthly focus visible at a glance
- keep editing comfortable through Obsidian-first workflows

## Concept

The system is intentionally split by visibility.

- `public-vault` is the public-facing slice
- `private-vault` is the private execution side
- `config` holds the shared schema, templates, and Obsidian setup

That split makes it possible to publish the shape of ongoing work without exposing private details.

## Repositories

- `config`
  Shared schema, templates, Obsidian configuration, and validation scripts.
- `public-vault`
  The public-facing vault and GitHub Pages surface.
- `private-vault`
  The private execution vault for details that should not be published.

## Core ideas

- Task files stay flat.
- Weekly and monthly attention live in the single `focus` property.
- Public and private views are split into separate repositories.
- Graph relations stay easy to edit through Obsidian GUI tooling.

## Editing stack

- Obsidian Properties
- Dataview
- Metadata Menu
- ExcaliBrain
- Vite

## Public boundary

`public-vault` is intentionally partial. It contains only public-facing tasks.

Private execution detail lives in `private-vault`, and work-managed streams are tracked elsewhere. In other words, the public graph is a real graph, but not the whole graph.
