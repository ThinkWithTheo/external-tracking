import { NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';

export async function GET() {
  try {
    // Get custom fields to find the developer field
    const customFields = await clickupAPI.getCustomFields();
    const developerField = customFields.find(field => 
      field.name.toLowerCase().includes('developer')
    );

    if (developerField && developerField.type === 'drop_down') {
      // Extract options from the dropdown field
      const options = developerField.type_config?.options || [];
      const developers = options.map((option) => ({
        id: option.orderindex || option.id,
        name: option.name,
        color: option.color
      }));

      return NextResponse.json({
        success: true,
        developers
      });
    }

    // If no dropdown field found, return empty array
    return NextResponse.json({
      success: true,
      developers: []
    });

  } catch (error: unknown) {
    const apiError = error as { message?: string };
    console.error('Error fetching developers:', error);
    
    return NextResponse.json(
      { 
        error: apiError.message || 'Failed to fetch developers',
        developers: []
      },
      { status: 500 }
    );
  }
}