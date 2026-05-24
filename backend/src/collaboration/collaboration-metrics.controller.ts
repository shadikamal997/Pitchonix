import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { YDocStore } from './ydoc-store';
import { CollaborationGateway } from './collaboration.gateway';
import { YDocSyncBus } from './ydoc-sync-bus';

// =============================================================================
//  Phase 34.3G + 34.4D — CollaborationMetricsController
//
//  Two endpoints:
//
//    GET /api/collaboration/metrics             JSON snapshot (dashboards)
//    GET /api/collaboration/metrics/prometheus  text/plain exporter
//
//  Both reveal only aggregate counts (no per-user data) so they're left
//  unauthenticated for scrapers + ops to hit.
// =============================================================================

@ApiTags('Collaboration')
@Controller('collaboration')
export class CollaborationMetricsController {
  constructor(
    private readonly ydocStore: YDocStore,
    private readonly gateway:   CollaborationGateway,
    private readonly syncBus:   YDocSyncBus,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Aggregate collaboration metrics (Y.Doc cache + presence rooms)' })
  metrics() {
    return {
      ydoc:     this.ydocStore.stats(),
      presence: this.gateway.presenceStats(),
      events:   this.gateway.eventCounters(),
      syncBus:  this.syncBus.stats(),
    };
  }

  // =========================================================================
  //  Phase 34.4D — Prometheus text exposition format
  //
  //  Conforms to the Prometheus 0.0.4 text format:
  //  https://prometheus.io/docs/instrumenting/exposition_formats/
  //
  //    # HELP <metric> <description>
  //    # TYPE <metric> <gauge|counter>
  //    <metric> <value>
  // =========================================================================

  @Get('metrics/prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus text-format exporter (scrape-friendly)' })
  prometheus(): string {
    const y = this.ydocStore.stats();
    const p = this.gateway.presenceStats();
    const e = this.gateway.eventCounters();
    const b = this.syncBus.stats();

    const lines: string[] = [];
    const gauge = (name: string, help: string, value: number) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    };
    const counter = (name: string, help: string, value: number) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    };

    // Y.Doc cache gauges
    gauge('collaboration_active_docs',        'Cached Y.Docs with at least one subscriber',  y.activeDocs);
    gauge('collaboration_cached_docs_total',  'Total cached Y.Docs (active + idle)',          y.cachedDocs);
    gauge('collaboration_dirty_docs',         'Cached Y.Docs with un-persisted edits',        y.dirtyDocs);
    gauge('collaboration_subscribers_total',  'Sum of Y.Doc subscribers across cached docs',  y.totalSubscribers);

    // Presence gauges
    gauge('collaboration_active_rooms',       'Active deck rooms with at least one socket',   p.rooms);
    gauge('collaboration_active_users',       'Unique users connected across all rooms',      p.users);
    gauge('collaboration_connected_sockets',  'Total connected sockets',                       p.connectedSockets);

    // Cumulative counters
    counter('collaboration_evictions_total',      'Y.Docs evicted from cache (cumulative)',           y.evictionCount);
    counter('collaboration_cursor_events_total',  'cursor.move events processed (cumulative)',        e.cursorEvents);
    counter('collaboration_yjs_updates_total',    'yjs.update events processed (cumulative)',         e.yjsUpdates);
    counter('collaboration_editing_events_total', 'editing.started events (cumulative)',              e.editingEvents);

    // Sync-bus health
    gauge('collaboration_syncbus_active',             'YDocSyncBus connected to Redis (0/1)',           b.active ? 1 : 0);
    counter('collaboration_syncbus_published_total',  'Y.Doc updates published to peers (cumulative)',  b.published);
    counter('collaboration_syncbus_received_total',   'Y.Doc updates received from peers (cumulative)', b.received);

    return lines.join('\n') + '\n';
  }
}
