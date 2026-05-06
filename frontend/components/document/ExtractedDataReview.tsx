'use client';

import { useState } from 'react';
import { CheckCircle, Edit2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ParsedDocument, ExtractedData } from '@/types/document';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ExtractedDataReviewProps {
  parsedDocument: ParsedDocument;
  onApply: (data: ExtractedData) => void;
  onCancel: () => void;
}

export function ExtractedDataReview({
  parsedDocument,
  onApply,
  onCancel,
}: ExtractedDataReviewProps) {
  const [editedData, setEditedData] = useState<ExtractedData>(parsedDocument.data);
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const fields = [
    { key: 'companyName', label: 'Company Name', type: 'input', section: 'Business Info' },
    { key: 'industry', label: 'Industry', type: 'input', section: 'Business Info' },
    { key: 'businessStage', label: 'Business Stage', type: 'input', section: 'Business Info' },
    { key: 'country', label: 'Country', type: 'input', section: 'Business Info' },
    { key: 'website', label: 'Website', type: 'input', section: 'Business Info' },
    { key: 'problem', label: 'Problem Statement', type: 'textarea', section: 'Business Details' },
    { key: 'solution', label: 'Solution', type: 'textarea', section: 'Business Details' },
    { key: 'targetCustomers', label: 'Target Customers', type: 'textarea', section: 'Business Details' },
    { key: 'differentiation', label: 'Differentiation', type: 'textarea', section: 'Business Details' },
    { key: 'marketSize', label: 'Market Size', type: 'textarea', section: 'Market' },
    { key: 'competitors', label: 'Competitors', type: 'textarea', section: 'Market' },
    { key: 'revenueModel', label: 'Revenue Model', type: 'textarea', section: 'Business Model' },
    { key: 'pricingStrategy', label: 'Pricing Strategy', type: 'textarea', section: 'Business Model' },
    { key: 'traction', label: 'Traction', type: 'textarea', section: 'Traction' },
    { key: 'teamInfo', label: 'Team', type: 'textarea', section: 'Team' },
    { key: 'fundingStatus', label: 'Funding Status', type: 'input', section: 'Funding' },
    { key: 'roadmap', label: 'Roadmap', type: 'textarea', section: 'Vision' },
  ];

  const toggleEdit = (key: string) => {
    setEditing((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(editedData);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Group fields by section
  const sections = fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, typeof fields>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Review Extracted Data</CardTitle>
              <CardDescription>
                Review and edit the information extracted from {parsedDocument.metadata.filename}
              </CardDescription>
            </div>
            <Badge variant={parsedDocument.confidence >= 80 ? 'default' : 'secondary'}>
              <span className={cn('font-semibold', getConfidenceColor(parsedDocument.confidence))}>
                {parsedDocument.confidence}% Confidence
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              The AI has extracted {parsedDocument.metadata.words} words from your document.
              Fields marked in <span className="text-green-600 font-semibold">green</span> have high confidence.
              Review and edit any fields that need adjustment before applying to your pitch deck.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Extracted Fields by Section */}
      {Object.entries(sections).map(([sectionName, sectionFields]) => {
        // Only show section if at least one field has data
        const hasData = sectionFields.some((field) => (editedData as any)[field.key]);
        if (!hasData) return null;

        return (
          <Card key={sectionName}>
            <CardHeader>
              <CardTitle className="text-lg">{sectionName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionFields.map((field) => {
                const value = (editedData as any)[field.key];
                if (!value) return null;

                const isEditing = editing[field.key];

                return (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.key} className="font-medium">
                        {field.label}
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEdit(field.key)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        {isEditing ? 'Done' : 'Edit'}
                      </Button>
                    </div>

                    {isEditing ? (
                      field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={value || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          rows={4}
                          className="font-mono text-sm"
                        />
                      ) : (
                        <Input
                          id={field.key}
                          value={value || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="font-mono text-sm"
                        />
                      )
                    ) : (
                      <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                        {value}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-3">
            <Button onClick={handleApply} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply to Wizard
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
