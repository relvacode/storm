import { Component } from '@angular/core';
import {DynamicDialogRef} from "primeng/dynamicdialog";

@Component({
  selector: 't-api-key-dialog',
  templateUrl: './api-key-dialog.component.html',
  styleUrls: ['./api-key-dialog.component.scss']
})
export class ApiKeyDialogComponent{
  key: string;

  constructor(private ref: DynamicDialogRef) { }

  onSubmit() {
    this.ref.close(this.key)
  }

}
