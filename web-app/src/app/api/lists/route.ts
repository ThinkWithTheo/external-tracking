import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';

export async function GET(request: NextRequest) {
  try {
    // Test API connection first
    const isConnected = await clickupAPI.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to ClickUp API. Please check your API token.' },
        { status: 500 }
      );
    }

    // Get all spaces for the team
    const spaces = await clickupAPI.getSpaces();
    
    // Get all lists from all spaces
    const allLists: any[] = [];
    const allFolders: any[] = [];
    
    for (const space of spaces) {
      try {
        // Try to get folders first, then lists from folders
        const folders = await clickupAPI.getFoldersInSpace(space.id);
        allFolders.push(...folders.map((folder: any) => ({
          ...folder,
          spaceName: space.name,
          spaceId: space.id
        })));
        
        // Get lists from each folder
        for (const folder of folders) {
          try {
            const folderLists = await clickupAPI.getListsInFolder(folder.id);
            allLists.push(...folderLists.map((list: any) => ({
              ...list,
              spaceName: space.name,
              spaceId: space.id,
              folderName: folder.name,
              folderId: folder.id
            })));
          } catch (error) {
            console.error(`Error fetching lists for folder ${folder.id}:`, error);
          }
        }
        
        // Also try to get lists directly from space (folderless lists)
        const spaceLists = await clickupAPI.getListsInSpace(space.id);
        allLists.push(...spaceLists.map((list: any) => ({
          ...list,
          spaceName: space.name,
          spaceId: space.id,
          folderName: 'No Folder',
          folderId: null
        })));
      } catch (error) {
        console.error(`Error fetching data for space ${space.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      spaces: spaces,
      folders: allFolders,
      lists: allLists,
      totalSpaces: spaces.length,
      totalFolders: allFolders.length,
      totalLists: allLists.length,
    });

  } catch (error) {
    console.error('Error in /api/lists:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch lists from ClickUp',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}