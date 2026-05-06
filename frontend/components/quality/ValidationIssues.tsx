'use client';

import React, { useState, useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ValidationIssueCard } from './ValidationIssueCard';
import { SEVERITY_COLORS, type ValidationIssue, type ValidationSeverity } from '@/types/quality';

interface ValidationIssuesProps {
  issues: ValidationIssue[];
  title?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  onSlideClick?: (slideIndex: number) => void;
  onDismiss?: (issue: ValidationIssue) => void;
}

export function ValidationIssues({
  issues,
  title = 'Validation Issues',
  showSearch = true,
  showFilters = true,
  onSlideClick,
  onDismiss,
}: ValidationIssuesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<ValidationSeverity | 'ALL'>('ALL');
  const [expandedSections, setExpandedSections] = useState<Record<ValidationSeverity, boolean>>({
    ERROR: true,
    WARNING: true,
    INFO: false,
  });

  // Count issues by severity
  const issueCountsBySeverity = useMemo(() => {
    return {
      ERROR: issues.filter((i) => i.severity === 'ERROR').length,
      WARNING: issues.filter((i) => i.severity === 'WARNING').length,
      INFO: issues.filter((i) => i.severity === 'INFO').length,
    };
  }, [issues]);

  // Filter and search issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Filter by severity
      if (filterSeverity !== 'ALL' && issue.severity !== filterSeverity) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          issue.message.toLowerCase().includes(query) ||
          issue.rule.toLowerCase().includes(query) ||
          issue.suggestion?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [issues, filterSeverity, searchQuery]);

  // Group issues by severity
  const issuesBySeverity = useMemo(() => {
    return {
      ERROR: filteredIssues.filter((i) => i.severity === 'ERROR'),
      WARNING: filteredIssues.filter((i) => i.severity === 'WARNING'),
      INFO: filteredIssues.filter((i) => i.severity === 'INFO'),
    };
  }, [filteredIssues]);

  // Toggle section expansion
  const toggleSection = (severity: ValidationSeverity) => {
    setExpandedSections((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  };

  // No issues state
  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">No Issues Found</p>
            <p className="text-sm text-gray-600 mt-1">
              Your presentation passed all validation checks!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Found {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
              {searchQuery || filterSeverity !== 'ALL' ? ' (filtered)' : ''}
            </p>
          </div>

          {/* Issue Count Badges */}
          <div className="flex items-center gap-2">
            {issueCountsBySeverity.ERROR > 0 && (
              <Badge variant="destructive">
                {issueCountsBySeverity.ERROR} Error{issueCountsBySeverity.ERROR !== 1 ? 's' : ''}
              </Badge>
            )}
            {issueCountsBySeverity.WARNING > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {issueCountsBySeverity.WARNING} Warning{issueCountsBySeverity.WARNING !== 1 ? 's' : ''}
              </Badge>
            )}
            {issueCountsBySeverity.INFO > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {issueCountsBySeverity.INFO} Info
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="flex gap-2">
            {showSearch && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            {showFilters && (
              <Select
                value={filterSeverity}
                onValueChange={(value) => setFilterSeverity(value as ValidationSeverity | 'ALL')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Severities</SelectItem>
                  <SelectItem value="ERROR">Errors Only</SelectItem>
                  <SelectItem value="WARNING">Warnings Only</SelectItem>
                  <SelectItem value="INFO">Info Only</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Issues by Severity */}
        {(['ERROR', 'WARNING', 'INFO'] as ValidationSeverity[]).map((severity) => {
          const severityIssues = issuesBySeverity[severity];
          if (severityIssues.length === 0) return null;

          const colors = SEVERITY_COLORS[severity];
          const icon = 
            severity === 'ERROR' ? <AlertCircle className="w-4 h-4" /> :
            severity === 'WARNING' ? <AlertTriangle className="w-4 h-4" /> :
            <Info className="w-4 h-4" />;

          return (
            <Collapsible
              key={severity}
              open={expandedSections[severity]}
              onOpenChange={() => toggleSection(severity)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-between ${colors.bg} hover:${colors.bg}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={colors.icon}>{icon}</span>
                    <span className={`${colors.text} font-semibold`}>
                      {severity}S
                    </span>
                    <Badge variant="secondary">{severityIssues.length}</Badge>
                  </div>
                  {expandedSections[severity] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {severityIssues.map((issue, index) => (
                  <ValidationIssueCard
                    key={`${issue.rule}-${index}`}
                    issue={issue}
                    onSlideClick={onSlideClick}
                    onDismiss={onDismiss}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
